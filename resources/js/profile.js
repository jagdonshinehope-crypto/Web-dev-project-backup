import { state, persist, toast } from './state';
import { authRequest, openAccount, updateHeader, show } from './navigation';
import { jobs } from './data';

let clientView = 'dashboard';
let selectedWorkerSkill = '';
let directoryWorkers = [];
let hiredWorkers = [];
let directoryRequestId = 0;

const emptyState = (title, text, action = '') => `<div class="status-row"><span class="job-left"><strong>${title}</strong><span>${text}</span></span>${action}</div>`;

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}[character]));

function pinnedWorkerStorageKey() {
    return `flexwork:pinned-workers:${state.user.id}`;
}

function togglePinnedWorker(worker) {
    if (!worker?.id) return;
    const pinned = getPinnedWorkers();
    const alreadyPinned = pinned.some((item) => item.id === Number(worker.id));
    const normalized = {
        id: Number(worker.id),
        name: worker.name || 'Worker',
        title: worker.title || worker.profile_title || '',
    };
    savePinnedWorkers(alreadyPinned
        ? pinned.filter((item) => item.id !== normalized.id)
        : [...pinned, normalized]);
    renderPinnedWorkers();
    if (clientView === 'results') renderDirectoryWorkers();
    renderProfile();
    toast(alreadyPinned ? 'Worker removed from pinned prospects.' : 'Worker added to pinned prospects.');
}

function getPinnedWorkers() {
    try {
        const stored = JSON.parse(localStorage.getItem(pinnedWorkerStorageKey()) || '[]');
        return Array.isArray(stored) ? stored.filter((worker) => worker && Number.isInteger(worker.id)) : [];
    } catch (error) {
        console.error('Unable to read pinned worker profiles.', error);
        return [];
    }
}

function savePinnedWorkers(workers) {
    try {
        localStorage.setItem(pinnedWorkerStorageKey(), JSON.stringify(workers));
    } catch (error) {
        console.error('Unable to save pinned worker profiles.', error);
        toast('Your pinned workers could not be saved in this browser.');
    }
}

async function makeBlurredIdPreview(file) {
    const image = await createImageBitmap(file);
    try {
        const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Your browser could not prepare a private ID preview.');
        context.filter = 'blur(22px)';
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve, reject) => canvas.toBlob(
            (result) => result ? resolve(result) : reject(new Error('The blurred ID preview could not be created.')),
            'image/jpeg',
            0.82,
        ));
        return new File([blob], 'blurred-id-proof.jpg', { type: 'image/jpeg' });
    } finally {
        image.close();
    }
}

async function signOut() {
    try {
        await authRequest('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
        state.user = null;
        state.role = null;
        persist();
        updateHeader();
        renderProfile();
        window.dispatchEvent(new Event('auth:updated'));
        show('welcome');
        toast('Signed out.');
    } catch (error) {
        toast(error.message);
    }
}

function renderPinnedWorkers() {
    const pinned = getPinnedWorkers();
    renderList(
        '#pinnedWorkerList',
        pinned.map((worker) => `<div class="pinned-worker-row"><span><strong>${escapeHtml(worker.name)}</strong><small>${escapeHtml(worker.title || 'Worker')}</small></span><button class="pinned-worker-remove" data-unpin-worker="${worker.id}" type="button" aria-label="Unpin ${escapeHtml(worker.name)}">Remove</button></div>`),
        '',
    );
    document.querySelectorAll('[data-unpin-worker]').forEach((button) => button.addEventListener('click', () => {
        savePinnedWorkers(getPinnedWorkers().filter((worker) => worker.id !== Number(button.dataset.unpinWorker)));
        renderPinnedWorkers();
        toast('Worker removed from pinned prospects.');
    }));
}

function setClientView(view) {
    show(view === 'dashboard' ? 'clientDashboard' : 'profile');
    clientView = view;
    document.querySelector('#clientWorkspace').hidden = view === 'dashboard' || view === 'profile';
    document.querySelector('#workerProfileView').hidden = view !== 'profile';
    document.querySelectorAll('[data-client-view]').forEach((section) => {
        section.hidden = section.dataset.clientView !== view;
    });
    if (view === 'categories') {
        renderClientCategories();
        loadClientJobs();
    }
}

function selectProfilePanel(name) {
    document.querySelectorAll('.profile-tab').forEach((item) => item.classList.toggle('active', item.dataset.profile === name));
    document.querySelectorAll('.profile-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `panel-${name}`));
}

function renderClientCategories() {
    const grouped = new Map();
    [...jobs, ...(state.clientJobs || [])].forEach((job) => {
        const category = job.cat?.trim();
        const title = job.title?.trim();
        if (!category || !title) return;
        if (!grouped.has(category)) grouped.set(category, new Map());
        grouped.get(category).set(title.toLowerCase(), title);
    });

    const groups = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
    document.querySelector('#clientCategoryGroups').innerHTML = groups.length
        ? groups.map(([category, titles]) => `<section class="client-category-group"><h2>${escapeHtml(category)}</h2><div>${[...titles.values()].map((title) => `<button data-worker-skill="${escapeHtml(title)}" type="button">${escapeHtml(title)}</button>`).join('')}</div></section>`).join('')
        : '<p class="worker-directory-empty">No opportunities have been posted yet.</p>';

    document.querySelectorAll('[data-worker-skill]').forEach((button) => button.addEventListener('click', () => browseWorkers(button.dataset.workerSkill)));
}

async function loadClientJobs() {
    if (!state.user) return;
    try {
        const payload = await authRequest('/jobs', { cache: 'no-store' });
        state.clientJobs = payload.jobs;
        renderClientCategories();
        window.dispatchEvent(new Event('jobs:updated'));
    } catch (error) {
        toast(error.message);
    }
}

function renderDirectoryWorkers() {
    const query = document.querySelector('#workerDirectorySearch').value.trim().toLowerCase();
    const filtered = directoryWorkers.filter((worker) =>
        `${worker.name} ${worker.title || ''} ${worker.skills || ''} ${worker.education || ''}`
            .toLowerCase()
            .includes(query),
    );
    const pinnedIds = new Set(getPinnedWorkers().map((worker) => worker.id));

    renderList(
        '#workerResults',
        filtered.map((worker) => {
            const initials = worker.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
            const pinned = pinnedIds.has(worker.id);
            const avatar = worker.avatar_url
                ? `<img src="${escapeHtml(worker.avatar_url)}" alt="">`
                : escapeHtml(initials);

            return `<article class="worker-result-card">
                <div class="worker-result-avatar" aria-hidden="true">${avatar}</div>
                <div class="worker-result-main">
                    <div class="worker-result-topline">
                        <div><span class="worker-result-name">${escapeHtml(worker.name)}</span><span class="worker-result-title">${escapeHtml(worker.title || selectedWorkerSkill)}</span></div>
                        <div class="worker-result-actions">
                            <button class="worker-pin-btn" data-pin-worker="${worker.id}" type="button">${pinned ? 'UNPIN' : 'PIN'}</button>
                            <button class="worker-view-btn" data-view-worker="${worker.id}" type="button">VIEW PROFILE</button>
                            <button class="worker-message-btn" data-message-worker="${worker.id}" type="button">MESSAGE</button>
                        </div>
                    </div>
                    ${worker.rating_average ? `<p class="worker-result-rating" aria-label="Rated ${worker.rating_average} out of 5">${'★'.repeat(Math.round(worker.rating_average))}${'☆'.repeat(5 - Math.round(worker.rating_average))} <span>${worker.rating_average} · ${worker.rating_count} ${worker.rating_count === 1 ? 'rating' : 'ratings'}</span></p>` : ''}
                    <div class="worker-result-meta">
                        ${worker.skills ? `<p><strong>SKILLS</strong>${escapeHtml(worker.skills)}</p>` : ''}
                        ${worker.education ? `<p><strong>EDUCATION</strong>${escapeHtml(worker.education)}</p>` : ''}
                    </div>
                    <p class="worker-result-description" data-worker-description="${worker.id}" hidden>${escapeHtml(worker.description || 'This worker has not added a profile summary yet.')}</p>
                </div>
            </article>`;
        }),
        '<p class="worker-directory-empty">No worker profiles match this skill yet. Browse another category or check back later.</p>',
    );
    renderList('#hiredWorkerResults', hiredWorkers.map((worker) => {
        const avatar = worker.avatar_url
            ? `<img src="${escapeHtml(worker.avatar_url)}" alt="">`
            : escapeHtml(worker.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase());
        return `<article class="hired-worker-card">
            <div class="worker-result-avatar" aria-hidden="true">${avatar}</div>
            <div class="hired-worker-copy"><strong>${escapeHtml(worker.name)}</strong><span>${escapeHtml(worker.job_title)} · Accepted</span></div>
            <div class="hired-worker-actions">
                <button class="worker-view-btn" data-view-worker="${worker.id}" type="button">VIEW PROFILE</button>
                <button class="worker-message-btn" data-message-worker="${worker.id}" type="button">MESSAGE</button>
                <label class="worker-rating-control">Your rating
                    <select data-worker-rating="${worker.application_id}" aria-label="Rate ${escapeHtml(worker.name)}">
                        <option value="">Rate worker</option>
                        ${[5, 4, 3, 2, 1].map((rating) => `<option value="${rating}" ${Number(worker.rating) === rating ? 'selected' : ''}>${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating})</option>`).join('')}
                    </select>
                </label>
            </div>
        </article>`;
    }), '<p class="worker-directory-empty">No workers have been hired for this role yet.</p>');

    document.querySelectorAll('#clientHiredList [data-view-worker]').forEach((button) => button.addEventListener('click', () => {
        const worker = [...directoryWorkers, ...hiredWorkers].find((item) => item.id === Number(button.dataset.viewWorker));
        if (worker) openWorkerDetails(worker);
    }));
    document.querySelectorAll('[data-message-worker]').forEach((button) => button.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('messages:open', { detail: { peerId: Number(button.dataset.messageWorker) } }));
        show('messages');
    }));
    document.querySelectorAll('[data-worker-rating]').forEach((select) => select.addEventListener('change', async () => {
        if (!select.value) return;
        select.disabled = true;
        try {
            await authRequest(`/applications/${select.dataset.workerRating}/rating`, {
                method: 'PUT',
                body: JSON.stringify({ rating: Number(select.value) }),
            });
            const worker = hiredWorkers.find((item) => String(item.application_id) === select.dataset.workerRating);
            if (worker) worker.rating = Number(select.value);
            toast('Your worker rating was saved.');
        } catch (error) {
            toast(error.message);
            select.value = '';
        } finally {
            select.disabled = false;
        }
    }));
}

function openWorkerDetails(worker) {
    document.querySelector('#workerDetailsName').textContent = worker.name;
    document.querySelector('#workerDetailsTitle').textContent = worker.title || 'FlexWork Worker';
    document.querySelector('#workerDetailsDescription').textContent = worker.description || 'This worker has not added a profile summary yet.';
    document.querySelector('#workerDetailsSkills').textContent = worker.skills || 'Not specified';
    document.querySelector('#workerDetailsEducation').textContent = worker.education || 'Not specified';
    document.querySelector('#workerDetailsPersonal').textContent = [
        worker.age ? `${worker.age} years old` : 'Age not specified',
        worker.gender || 'Gender not specified',
        worker.location || 'Birthplace not specified',
    ].join(' · ');
    const rating = worker.rating_average
        ? `${worker.rating_average} out of 5 · ${worker.rating_count} ${worker.rating_count === 1 ? 'rating' : 'ratings'}`
        : 'No ratings yet';
    document.querySelector('#workerDetailsRating').textContent = rating;
    const image = document.querySelector('#workerDetailsAvatar');
    image.hidden = !worker.avatar_url;
    image.src = worker.avatar_url || '';
    document.querySelector('#workerDetailsPlaceholder').hidden = Boolean(worker.avatar_url);
    document.querySelector('#workerDetailsMessage').onclick = () => {
        document.querySelector('#workerDetailsModal').classList.add('hidden');
        window.dispatchEvent(new CustomEvent('messages:open', { detail: { peerId: Number(worker.id) } }));
        show('messages');
    };
    document.querySelector('#workerDetailsModal').classList.remove('hidden');
}

async function browseWorkers(skill) {
    selectedWorkerSkill = skill;
    directoryWorkers = [];
    const requestId = ++directoryRequestId;
    document.querySelector('#workerResultsTitle').textContent = `Hire top-tier ${skill} experts`;
    document.querySelector('#workerResultsCopy').textContent = `Browse worker profiles with ${skill} skills and experience.`;
    document.querySelector('#workerBreadcrumb').textContent = skill;
    document.querySelector('#workerDirectorySearch').value = '';
    document.querySelector('#workerResults').innerHTML = '<p class="worker-directory-loading">Loading matching worker profiles…</p>';
    setClientView('results');

    try {
        const payload = await authRequest(`/workers?skill=${encodeURIComponent(skill)}`, { cache: 'no-store' });
        if (requestId !== directoryRequestId) return;
        directoryWorkers = payload.workers;
        hiredWorkers = payload.hired || [];
        renderDirectoryWorkers();
    } catch (error) {
        if (requestId !== directoryRequestId) return;
        document.querySelector('#workerResults').innerHTML = `<p class="worker-directory-error">Worker profiles could not be loaded. ${escapeHtml(error.message)}</p>`;
        toast(error.message);
    }
}

function renderList(selector, items, empty) {
    document.querySelector(selector).innerHTML = items.length ? items.join('') : empty;
}

function reviewActions(application) {
    const workerId = application.worker?.id || application.workerId;
    const name = application.worker?.name || application.workerName || 'Worker applicant';
    if (application.status === 'pending') {
        return `<div class="review-actions">
            <button class="mini-btn" data-view-resume="${application.resumeUrl}" type="button">VIEW RESUME</button>
            <button class="mini-btn" data-message-applicant="${workerId}" type="button">MESSAGE</button>
            <button class="mini-btn" data-pin-worker="${workerId}" type="button">${getPinnedWorkers().some((worker) => worker.id === Number(workerId)) ? 'UNPIN PROSPECT' : 'PIN PROSPECT'}</button>
            <button class="mini-btn accept-application-btn" data-application-action="accepted" data-application-id="${application.id}" type="button">ACCEPT</button>
            <button class="mini-btn reject-application-btn" data-application-action="rejected" data-application-id="${application.id}" type="button">REJECT</button>
        </div>`;
    }
    if (application.status === 'accepted') {
        return `<div class="review-actions">
            <span class="status-chip status-approved">ACCEPTED</span>
            <button class="mini-btn" data-view-resume="${application.resumeUrl}" type="button">VIEW RESUME</button>
            <button class="mini-btn" data-message-applicant="${workerId}" type="button">MESSAGE ${escapeHtml(name)}</button>
            <button class="mini-btn" data-pin-worker="${workerId}" type="button">${getPinnedWorkers().some((worker) => worker.id === Number(workerId)) ? 'UNPIN PROSPECT' : 'PIN PROSPECT'}</button>
            <label class="application-rating-control">Rate this worker
                <select data-application-rating="${application.id}" aria-label="Rate ${escapeHtml(name)}">
                    <option value="">${application.rating ? `Rated ${application.rating} / 5` : 'Choose stars'}</option>
                    ${[5, 4, 3, 2, 1].map((rating) => `<option value="${rating}" ${Number(application.rating) === rating ? 'selected' : ''}>${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating})</option>`).join('')}
                </select>
            </label>
        </div>`;
    }
    return `<span class="status-chip status-rejected">REJECTED</span>`;
}

function clientProfileAction(application) {
    return application.clientProfileUrl
        ? `<button class="mini-btn" data-client-profile="${escapeHtml(application.clientProfileUrl)}" type="button">VIEW CLIENT PROFILE</button>`
        : '';
}

async function loadApplications() {
    if (!state.user) {
        state.applications = [];
        renderProfile();
        return;
    }
    try {
        const payload = await authRequest('/applications', { cache: 'no-store' });
        state.applications = payload.applications || [];
        persist();
        renderProfile();
    } catch (error) {
        toast(`Applications could not be loaded. ${error.message}`);
    }
}

function renderClientHires(applications) {
    const hires = applications.filter((application) => application.status === 'accepted');
    document.querySelector('#clientHiredEmpty').hidden = hires.length > 0;
    renderList('#clientHiredList', hires.map((application) => {
        const worker = application.worker || {};
        return `<article class="client-hired-card">
            <strong>${escapeHtml(worker.name || 'Worker')}</strong>
            <span>${escapeHtml(application.title || 'Job')} · Accepted</span>
            ${worker.ratingAverage ? `<span class="worker-result-rating">${'★'.repeat(Math.round(worker.ratingAverage))}${'☆'.repeat(5 - Math.round(worker.ratingAverage))} ${Number(worker.ratingAverage).toFixed(1)} · ${worker.ratingCount} ratings</span>` : ''}
            <div class="hired-worker-actions">
                <button class="worker-view-btn" data-view-worker="${worker.id}" type="button">VIEW PROFILE</button>
                <button class="worker-message-btn" data-message-applicant="${worker.id}" type="button">MESSAGE</button>
                <button class="worker-pin-btn" data-pin-worker="${worker.id}" type="button">${getPinnedWorkers().some((pinned) => pinned.id === Number(worker.id)) ? 'UNPIN' : 'PIN PROSPECT'}</button>
                <label class="application-rating-control">Rate
                    <select data-application-rating="${application.id}" aria-label="Rate ${escapeHtml(worker.name || 'worker')}">
                        <option value="">${application.rating ? `Rated ${application.rating} / 5` : 'Rate worker'}</option>
                        ${[5, 4, 3, 2, 1].map((rating) => `<option value="${rating}" ${Number(application.rating) === rating ? 'selected' : ''}>${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</option>`).join('')}
                    </select>
                </label>
            </div>
        </article>`;
    }), '<p>Your accepted workers will appear here.</p>');
}

function bindApplicationActions() {
    document.querySelectorAll('[data-application-action]').forEach((button) => button.addEventListener('click', async () => {
        button.disabled = true;
        try {
            const payload = await authRequest(`/applications/${button.dataset.applicationId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: button.dataset.applicationAction }),
            });
            const index = state.applications.findIndex((item) => String(item.id) === button.dataset.applicationId);
            if (index !== -1) state.applications[index] = payload.application;
            await loadApplications();
            toast(button.dataset.applicationAction === 'accepted' ? 'Worker accepted for this job.' : 'Application rejected.');
        } catch (error) {
            toast(error.message);
            button.disabled = false;
        }
    }));
    document.querySelectorAll('[data-view-resume]').forEach((button) => button.addEventListener('click', () => {
        document.querySelector('#previewResumeTitle').textContent = 'Applicant resume';
        document.querySelector('#resumePreviewFrame').innerHTML = `<iframe src="${escapeHtml(button.dataset.viewResume)}" title="Applicant resume preview"></iframe>`;
        document.querySelector('#previewDownloadBtn').hidden = true;
        document.querySelector('#resumePreviewModal').classList.remove('hidden');
    }));
    document.querySelectorAll('[data-message-applicant]').forEach((button) => button.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('messages:open', { detail: { peerId: Number(button.dataset.messageApplicant) } }));
        show('messages');
    }));
    document.querySelectorAll('[data-application-rating]').forEach((select) => select.addEventListener('change', async () => {
        if (!select.value) return;
        select.disabled = true;
        try {
            await authRequest(`/applications/${select.dataset.applicationRating}/rating`, {
                method: 'PUT',
                body: JSON.stringify({ rating: Number(select.value) }),
            });
            const application = state.applications.find((item) => String(item.id) === select.dataset.applicationRating);
            if (application) application.rating = Number(select.value);
            renderClientHires(state.applications);
            bindApplicationActions();
            toast('Your worker rating was saved.');
        } catch (error) {
            toast(error.message);
        } finally {
            select.disabled = false;
        }
    }));
    document.querySelectorAll('[data-view-worker]').forEach((button) => button.addEventListener('click', () => {
        const application = state.applications.find((item) => Number(item.worker?.id || item.workerId) === Number(button.dataset.viewWorker));
        if (application?.worker) openWorkerDetails({
            ...application.worker,
            avatar_url: application.worker.avatarUrl,
            rating_average: application.worker.ratingAverage,
            rating_count: application.worker.ratingCount,
        });
    }));
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
    const client = state.role === 'client' && Boolean(state.user);
    const profile = state.profile;
    const applications = state.applications || [];
    const received = client ? applications : [];
    const starred = jobs.filter((job) => state.starred.includes(job.id));
    const posted = state.clientJobs || [];

    document.querySelector('#clientWorkspace').hidden = !client || clientView === 'dashboard' || clientView === 'profile';
    document.querySelector('#workerProfileView').hidden = client && clientView !== 'profile';
    document.querySelector('#clientLogoutBtn').hidden = !client;
    if (client) {
        renderPinnedWorkers();
        renderClientCategories();
        renderClientHires(applications);
    }

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
    document.querySelector('#profilePersonalText').textContent = [
        profile.age ? `${profile.age} years old` : 'Age not specified',
        profile.gender || 'Gender not specified',
        profile.birthplace || 'Birthplace not specified',
    ].join(' · ');
    document.querySelector('#profileRole').textContent = state.user ? `${client ? 'Client' : 'Worker'} · ${client ? 'Hiring / Talent seeker' : 'Job seeker'}` : 'Not signed in';
    document.querySelector('#profileSignIn').hidden = Boolean(state.user);
    document.querySelector('#logoutBtn').hidden = !state.user;
    document.querySelectorAll('.client-only').forEach((element) => { element.hidden = !client; });
    document.querySelectorAll('.worker-only').forEach((element) => { element.hidden = !state.user || state.role !== 'worker'; });
    document.querySelector('#applicationsTitle').textContent = client ? 'My Posted Jobs' : 'My applications';

    renderList('#myJobsList', client ? posted.map((job) => `<div class="myjob-row"><div class="job-left"><strong>${escapeHtml(job.title)}</strong><span>${escapeHtml(job.cat)} · ${escapeHtml(job.place)} · ${escapeHtml(job.salary)}</span></div><span class="status-chip status-approved">LIVE</span></div>`) : applications.map((application) => `<div class="myjob-row"><div class="job-left"><strong>${escapeHtml(application.title)}</strong><span>${escapeHtml(application.company)} · ${escapeHtml(application.submitted)}</span></div><div class="application-actions"><span class="status-chip status-${application.status === 'accepted' ? 'approved' : application.status === 'rejected' ? 'rejected' : 'pending'}">${escapeHtml(application.status.toUpperCase())}</span>${clientProfileAction(application)}</div></div>`), client ? emptyState('No jobs posted yet', 'Use Post a Job to create your first opportunity for workers.') : emptyState('No applications yet', 'Browse opportunities and submit an application with your resume.'));
    document.querySelector('#myJobsCount').textContent = `${client ? posted.length : applications.length} items`;
    renderList('#postedJobsList', posted.map((job) => `<div class="myjob-row"><div class="job-left"><strong>${escapeHtml(job.title)}</strong><span>${escapeHtml(job.cat)} · ${escapeHtml(job.place)} · ${escapeHtml(job.budget)}</span></div><span class="status-chip status-approved">LIVE</span></div>`), emptyState('No jobs posted yet', 'Use Post a Job to create your first opportunity for workers.'));
    renderList('#receivedList', received.map((application) => `<div class="myjob-row"><div class="job-left"><strong>${escapeHtml(application.title)}</strong><span>${escapeHtml(application.worker?.name || 'Worker applicant')} · ${escapeHtml(application.company)} · ${escapeHtml(application.submitted)}</span>${application.response ? `<p class="application-response">${escapeHtml(application.response)}</p>` : ''}</div>${reviewActions(application)}</div>`), emptyState('No worker applications yet', 'Applications to your posted jobs will appear here.'));
    renderList('#starredList', starred.map((job) => `<div class="myjob-row"><div class="job-left"><strong>${job.title}</strong><span>${job.company}</span></div></div>`), emptyState('No starred jobs yet', 'Save opportunities to find them here.'));
    renderList('#pendingList', client ? received.filter((application) => application.status === 'pending').map((application) => `<div class="myjob-row"><div class="job-left"><strong>${escapeHtml(application.title)}</strong><span>${escapeHtml(application.worker?.name || 'Worker applicant')} · ${escapeHtml(application.submitted)}</span></div>${reviewActions(application)}</div>`) : applications.filter((application) => application.status === 'pending').map((application) => `<div class="myjob-row"><div class="job-left"><strong>${escapeHtml(application.title)}</strong><span>${escapeHtml(application.company)} · ${escapeHtml(application.submitted)}</span></div><div class="application-actions"><span class="status-chip status-pending">PENDING REVIEW</span>${clientProfileAction(application)}</div></div>`), emptyState(client ? 'No pending worker applications' : 'No pending applications', client ? 'Worker applications waiting for your review will appear here.' : 'Submitted applications will appear here.'));
    renderList('#rejectedList', applications.filter((application) => application.status === 'rejected').map((application) => `<div class="myjob-row"><div class="job-left"><strong>${escapeHtml(application.title)}</strong><span>${escapeHtml(application.company)} · ${escapeHtml(application.submitted)}</span></div><div class="application-actions"><span class="status-chip status-rejected">Rejected</span>${clientProfileAction(application)}</div></div>`), emptyState('No rejected applications', 'Keep building skills and applying.'));
    bindApplicationActions();
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

function updateWorkerRating(rating) {
    const average = Number(rating?.average || 0);
    const count = Number(rating?.count || 0);
    const stars = document.querySelector('#profile .client-ratings .rating-stars');
    stars.innerHTML = Array.from({ length: 5 }, (_, index) => `<span>${index < Math.round(average) ? '★' : '☆'}</span>`).join('');
    stars.setAttribute('aria-label', count ? `Rated ${average.toFixed(1)} out of 5 from ${count} client ratings` : 'No client ratings yet');
    document.querySelector('#clientRatingSummary').textContent = count
        ? `${average.toFixed(1)} out of 5 · ${count} ${count === 1 ? 'client rating' : 'client ratings'}`
        : 'No client ratings yet';
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
        updateWorkerRating(payload.rating);
        persist();
        renderProfile();
    } catch (error) {
        toast(error.message);
    }
}

async function loadVerificationStatus() {
    if (!state.user || !['worker', 'client'].includes(state.role)) return;
    try {
        const payload = await authRequest('/profile/verification');
        updateVerificationStatus(payload.status);
    } catch (error) {
        toast(error.message);
    }
}

export function initProfile() {
    window.addEventListener('screen:changed', (event) => {
        if (state.role !== 'client') return;
        if (event.detail === 'clientDashboard') clientView = 'dashboard';
        if (event.detail === 'profile') {
            clientView = 'profile';
            selectProfilePanel('posted');
        }
        renderProfile();
    });
    window.addEventListener('auth:updated', () => {
        renderProfile();
        loadRemoteProfile();
        loadVerificationStatus();
        loadClientJobs();
        loadApplications();
    });
    window.addEventListener('applications:updated', loadApplications);
    window.addEventListener('client-profile:open', async (event) => {
        if (state.role !== 'worker' || !event.detail?.url) return;
        try {
            const payload = await authRequest(event.detail.url, { cache: 'no-store' });
            const profile = payload.profile;
            document.querySelector('#clientDetailsName').textContent = profile.name;
            document.querySelector('#clientDetailsLocation').textContent = profile.location;
            document.querySelector('#clientDetailsPersonal').textContent = `${profile.age ? `${profile.age} years old` : 'Age not specified'} · ${profile.gender}`;
            document.querySelector('#clientDetailsOverview').textContent = profile.overview;
            const proofSection = document.querySelector('#clientIdProofSection');
            proofSection.hidden = !profile.id_proof_available || !profile.id_proof_url;
            const proofFrame = document.querySelector('#clientIdProofFrame');
            proofFrame.hidden = true;
            proofFrame.replaceChildren();
            document.querySelector('#showClientIdProofBtn').onclick = () => {
                proofFrame.innerHTML = `<iframe src="${escapeHtml(profile.id_proof_url)}" title="Blurred client identity proof" referrerpolicy="no-referrer"></iframe>`;
                proofFrame.hidden = false;
            };
            document.querySelector('#clientDetailsModal').classList.remove('hidden');
        } catch (error) {
            toast(`Client profile could not be loaded. ${error.message}`);
        }
    });
    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-client-profile]');
        if (button) {
            window.dispatchEvent(new CustomEvent('client-profile:open', { detail: { url: button.dataset.clientProfile } }));
            return;
        }
        const pinButton = event.target.closest('[data-pin-worker]');
        if (!pinButton) return;
        const workerId = Number(pinButton.dataset.pinWorker);
        const worker = [...directoryWorkers, ...hiredWorkers]
            .find((item) => Number(item.id) === workerId)
            || (state.applications || []).find((application) => Number(application.worker?.id || application.workerId) === workerId)?.worker;
        if (worker) togglePinnedWorker(worker);
    });
    window.addEventListener('jobs:loaded', renderClientCategories);
    window.addEventListener('jobs:updated', renderClientCategories);
    loadRemoteProfile();
    loadVerificationStatus();
    loadApplications();
    document.querySelectorAll('[data-profile]').forEach((button) => button.addEventListener('click', () => {
        selectProfilePanel(button.dataset.profile);
    }));
    document.querySelector('#logoutBtn').addEventListener('click', signOut);
    document.querySelector('#clientLogoutBtn').addEventListener('click', signOut);
    document.querySelector('#profileSignIn').addEventListener('click', () => openAccount());
    document.querySelectorAll('[data-browse-workers]').forEach((button) => button.addEventListener('click', () => setClientView('categories')));
    document.querySelectorAll('[data-client-back]').forEach((button) => button.addEventListener('click', () => setClientView(button.dataset.clientBack)));
    document.querySelector('#workerDirectorySearch').addEventListener('input', renderDirectoryWorkers);
    document.querySelector('[data-scroll-workers]').addEventListener('click', () => {
        document.querySelector('#workerResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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
        document.querySelector('#verificationModal h3').textContent = state.role === 'client' ? 'Verify your client account' : 'Verify your identity';
        document.querySelector('#verificationModal .verification-privacy').textContent = state.role === 'client'
            ? 'Client proof must be an image. FlexWork stores the original privately and shares only a blurred preview with workers.'
            : 'Accepted: JPG, JFIF, PNG, or PDF · Maximum 5 MB.';
        document.querySelector('#verificationFile').accept = state.role === 'client'
            ? '.jpg,.jpeg,.jfif,.png,image/jpeg,image/jfif,image/png'
            : '.jpg,.jpeg,.jfif,.png,.pdf,image/jpeg,image/jfif,image/png,application/pdf';
        document.querySelector('#verificationModal').classList.remove('hidden');
    });
    document.querySelector('#postJobBtn').addEventListener('click', () => {
        if (!state.user || state.role !== 'client') { openAccount('signup', 'client'); return; }
        document.querySelector('#postJobModal').classList.remove('hidden');
    });
    document.querySelector('#clientPostJobBtn').addEventListener('click', () => {
        if (!state.user || state.role !== 'client') { openAccount('signup', 'client'); return; }
        document.querySelector('#postJobModal').classList.remove('hidden');
    });
    document.querySelector('#postJobForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!state.user || state.role !== 'client') { toast('Sign in with a client account to post a job.'); return; }
        const title = document.querySelector('#postJobTitle').value.trim();
        const place = document.querySelector('#postJobPlace').value.trim();
        const budget = document.querySelector('#postJobBudget').value.trim();
        const desc = document.querySelector('#postJobDescription').value.trim();
        const applicationMethod = document.querySelector('#postJobApplicationMethod').value;
        const applicationQuestion = document.querySelector('#postJobApplicationQuestion').value.trim();
        if (!title || !place || !budget || !desc) { toast('Complete all required job fields.'); return; }
        if (applicationMethod === 'form' && !applicationQuestion) { toast('Add the question or instructions for your application form.'); return; }
        const tags = [...document.querySelectorAll('#postJobForm .skill-options input:checked')].map((input) => input.value).filter((tag) => tag !== 'Others');
        const otherSkill = document.querySelector('#postJobOtherSkill').value.trim();
        if (document.querySelector('#otherSkillChoice').checked && otherSkill) tags.push(otherSkill);
        const category = document.querySelector('#postJobCategory').value === 'Others' ? document.querySelector('#postJobOtherCategory').value.trim() : document.querySelector('#postJobCategory').value;
        if (!category) { toast('Specify the other category.'); return; }
        const submit = form.querySelector('[type="submit"]');
        submit.disabled = true;
        try {
            const payload = await authRequest('/jobs', {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    category,
                    location: place,
                    type: document.querySelector('#postJobType').value,
                    salary: budget,
                    description: desc,
                    tags,
                    application_instructions: document.querySelector('#postJobApplicationInstructions').value.trim(),
                    application_method: applicationMethod === 'form' ? 'form' : 'direct',
                    application_question: applicationMethod === 'form' ? applicationQuestion : '',
                }),
            });
            state.clientJobs.unshift(payload.job);
            form.reset();
            document.querySelector('#postJobApplicationQuestionLabel').hidden = true;
            document.querySelector('#otherCategoryLabel').hidden = true;
            document.querySelector('#postJobOtherSkill').hidden = true;
            document.querySelector('#postJobModal').classList.add('hidden');
            renderProfile();
            window.dispatchEvent(new Event('jobs:updated'));
            toast('Job published. Workers can now apply.');
        } catch (error) {
            toast(error.message);
        } finally {
            submit.disabled = false;
        }
    });
    document.querySelector('#postJobCategory').addEventListener('change', (event) => { document.querySelector('#otherCategoryLabel').hidden = event.target.value !== 'Others'; });
    document.querySelector('#otherSkillChoice').addEventListener('change', (event) => { document.querySelector('#postJobOtherSkill').hidden = !event.target.checked; });
    document.querySelector('#postJobApplicationMethod').addEventListener('change', (event) => {
        document.querySelector('#postJobApplicationQuestionLabel').hidden = event.target.value !== 'form';
    });
    document.querySelector('#clientMessagesBtn').addEventListener('click', () => show('messages'));
    loadClientJobs();
    const openProfileEditor = (focusEducation = false) => {
        if (!state.user) { openAccount('signin'); return; }
        document.querySelector('#profileFullName').value = state.profile.name || state.user?.name || '';
        document.querySelector('#profileTitle').value = state.profile.title || '';
        document.querySelector('#profileSkills').value = state.profile.skills || '';
        document.querySelector('#profileEducation').value = state.profile.education || '';
        document.querySelector('#profileBio').value = state.profile.description || '';
        document.querySelector('#profileBirthDate').value = state.profile.birth_date || '';
        document.querySelector('#profileGender').value = state.profile.gender || '';
        document.querySelector('#profileBirthplace').value = state.profile.birthplace || '';
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
            birth_date: document.querySelector('#profileBirthDate').value,
            gender: document.querySelector('#profileGender').value,
            birthplace: document.querySelector('#profileBirthplace').value.trim(),
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
        const allowedTypes = state.role === 'client'
            ? ['image/jpeg', 'image/jfif', 'image/png']
            : ['image/jpeg', 'image/jfif', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type) && !isJfif) {
            toast(state.role === 'client' ? 'Choose a JPG, JFIF, or PNG client ID.' : 'Choose a JPG, JFIF, PNG, or PDF ID.');
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
        if (state.role === 'client') {
            try {
                formData.append('preview', await makeBlurredIdPreview(file));
            } catch (error) {
                toast(error.message);
                return;
            }
        }
        const submit = document.querySelector('#submitVerificationBtn');
        submit.disabled = true;
        try {
            const payload = await authRequest('/profile/verification', { method: 'POST', body: formData });
            updateVerificationStatus(payload.status);
            await loadRemoteProfile();
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
