import { jobs } from './data';
import { state, persist, toast } from './state';
import { authRequest, openAccount, show } from './navigation';

let category = 'All Categories';
let filter = 'all';
let pendingResumeFile = null;
let pendingApplicationAnswer = '';
let loadingPostedJobs = false;

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}[character]));

function allJobs() {
    return [...jobs, ...(state.clientJobs || [])];
}

function renderCategories() {
    const categories = ['All Categories', ...new Set(allJobs().map((job) => job.cat))];
    if (!categories.includes(category)) category = 'All Categories';
    document.querySelector('#categoryBar').innerHTML = categories.map((item) => `<button class="category-btn ${item === category ? 'active' : ''}" data-category="${escapeHtml(item)}" type="button">${escapeHtml(item)}</button>`).join('');
}

function openJob(id) {
    state.activeJob = allJobs().find((job) => String(job.id) === String(id));
    if (!state.activeJob) {
        toast('This opportunity is no longer available. Refresh the list and try again.');
        return;
    }
    pendingApplicationAnswer = '';
    document.querySelector('#jobTitle').textContent = state.activeJob.title;
    document.querySelector('#jobCopy').textContent = state.activeJob.desc;
    document.querySelector('#jobMeta').innerHTML = `<div class="job-summary"><strong>${escapeHtml(state.activeJob.company)}</strong><p>${escapeHtml(state.activeJob.cat)} · ${escapeHtml(state.activeJob.place)} · ${escapeHtml(state.activeJob.salary)}</p></div>`;
    document.querySelector('#jobDetails').classList.add('hidden');
    document.querySelector('#jobOverview').textContent = state.activeJob.overview || state.activeJob.desc;
    document.querySelector('#jobApplicationInstructions').textContent = state.activeJob.applicationInstructions || 'Submit your resume through FlexWork to apply.';
    document.querySelector('#jobApplicationMethod').textContent = state.activeJob.applicationMethod === 'form'
        ? 'This client requires an application response before you submit your resume.'
        : 'Apply directly by submitting your resume.';
    document.querySelector('#jobPoster').textContent = state.activeJob.postedBy
        ? `${state.activeJob.postedBy} · ${state.activeJob.company}`
        : state.activeJob.company;
    const clientProfileButton = document.querySelector('#viewClientProfileBtn');
    clientProfileButton.hidden = state.role !== 'worker' || !state.activeJob.clientProfileUrl;
    clientProfileButton.dataset.clientProfileUrl = state.activeJob.clientProfileUrl || '';
    document.querySelector('#applyBtn').textContent = 'See more →';
    document.querySelector('#starJobBtn').textContent = state.starred.includes(id) ? '★ Starred' : '☆ Star';
    document.querySelector('#jobModal').classList.remove('hidden');
}

export function renderJobs() {
    renderCategories();
    const query = document.querySelector('#jobSearch').value.toLowerCase().trim();
    const filtered = allJobs().filter((job) => (category === 'All Categories' || job.cat === category) && (filter === 'all' || job.type === filter || (filter === 'remote' && job.place.toLowerCase().includes('remote'))) && (!query || `${job.title} ${job.company} ${job.cat} ${job.tags.join(' ')}`.toLowerCase().includes(query)));
    document.querySelector('#jobGrid').innerHTML = filtered.length ? filtered.map((job) => `<article class="job-card"><div class="company-line"><span class="company-logo">${escapeHtml(job.company[0])}</span><span class="match">${escapeHtml(job.match)}% match</span></div><h3>${escapeHtml(job.title)}</h3><p>${escapeHtml(job.company)} · ${escapeHtml(job.place)} · ${escapeHtml(job.salary)}</p><div class="job-tags">${job.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div><button class="job-btn" data-job="${escapeHtml(job.id)}" type="button">View job post &rarr;</button></article>`).join('') : '<div class="no-results">No jobs match your filters.</div>';
}

async function submitApplication() {
    const job = state.activeJob;
    if (!job) {
        toast('Select an opportunity before applying.');
        return;
    }
    if (state.applications.some((application) => String(application.jobId) === String(job.id))) {
        toast('You already applied to this opportunity.');
        return;
    }
    if (!state.user || state.role !== 'worker') {
        toast('Sign in with a worker account to apply.');
        return;
    }

    let resumeFile = pendingResumeFile;
    if (!resumeFile && state.resume?.data) {
        const response = await fetch(state.resume.data);
        const blob = await response.blob();
        resumeFile = new File([blob], state.resume.name || 'resume', {
            type: state.resume.type || blob.type || 'application/octet-stream',
        });
    }
    if (!resumeFile) {
        toast('Upload a resume before applying.');
        openResumeUpload();
        return;
    }

    const formData = new FormData();
    formData.append('job_id', String(job.id));
    formData.append('resume', resumeFile, resumeFile.name);
    if (pendingApplicationAnswer) formData.append('response', pendingApplicationAnswer);
    const submitButton = document.querySelector('#continueApplicationBtn');
    if (submitButton) submitButton.disabled = true;
    try {
        const payload = await authRequest('/applications', { method: 'POST', body: formData });
        state.applications.unshift(payload.application);
        persist();
        pendingApplicationAnswer = '';
        document.querySelector('#jobModal').classList.add('hidden');
        document.querySelector('#resumeUploadModal').classList.add('hidden');
        toast('Application submitted with your resume.');
        show('profile');
        setTimeout(() => document.querySelector('[data-profile="pending"]')?.click(), 0);
        window.dispatchEvent(new Event('applications:updated'));
    } catch (error) {
        toast(error.message);
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

function openResumeUpload() {
    document.querySelector('#jobModal').classList.add('hidden');
    document.querySelector('#resumeJobTitle').textContent = state.activeJob.title;
    document.querySelector('#resumeUploadName').textContent = 'No file selected';
    document.querySelector('#continueApplicationBtn').disabled = true;
    pendingResumeFile = null;
    document.querySelector('#resumeUploadModal').classList.remove('hidden');
}

function initResumeUpload() {
    document.querySelector('#chooseJobResumeBtn').addEventListener('click', () => document.querySelector('#jobResumeInput').click());
    document.querySelector('#jobResumeInput').addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!/\.(pdf|doc|docx)$/i.test(file.name)) { toast('Choose a PDF, DOC, or DOCX file.'); return; }
        if (file.size > 4 * 1024 * 1024) { toast('Choose a resume smaller than 4 MB.'); return; }
        pendingResumeFile = file;
        document.querySelector('#resumeUploadName').textContent = file.name;
        document.querySelector('#continueApplicationBtn').disabled = false;
    });
    document.querySelector('#continueApplicationBtn').addEventListener('click', () => {
        if (!pendingResumeFile) return;
        const reader = new FileReader();
        reader.onload = () => {
            state.resume = { name: pendingResumeFile.name, type: pendingResumeFile.type, size: pendingResumeFile.size, data: reader.result, updated: new Date().toLocaleDateString() };
            persist();
            submitApplication();
        };
        reader.readAsDataURL(pendingResumeFile);
    });
}

export function initOpportunities() {
    document.querySelector('#jobGrid').addEventListener('click', (event) => {
        const button = event.target.closest('[data-job]');
        if (button) openJob(button.dataset.job);
    });
    document.querySelector('#viewClientProfileBtn').addEventListener('click', () => {
        const button = document.querySelector('#viewClientProfileBtn');
        window.dispatchEvent(new CustomEvent('client-profile:open', { detail: { url: button.dataset.clientProfileUrl } }));
    });
    document.querySelector('#categoryBar').addEventListener('click', (event) => {
        const button = event.target.closest('[data-category]');
        if (!button) return;
        category = button.dataset.category;
        renderJobs();
    });
    document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => { filter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('active', item === button)); renderJobs(); }));
    document.querySelector('#jobSearch').addEventListener('input', renderJobs);
    document.querySelector('#starJobBtn').addEventListener('click', () => {
        const id = state.activeJob.id;
        state.starred = state.starred.includes(id) ? state.starred.filter((item) => item !== id) : [...state.starred, id];
        persist();
        document.querySelector('#starJobBtn').textContent = state.starred.includes(id) ? '★ Starred' : '☆ Star';
        toast('Starred jobs updated.');
    });
    document.querySelector('#applyBtn').addEventListener('click', () => {
        const details = document.querySelector('#jobDetails');
        if (details.classList.contains('hidden')) {
            details.classList.remove('hidden');
            document.querySelector('#applyBtn').textContent = 'Apply now →';
            return;
        }
        if (!state.user) { document.querySelector('#jobModal').classList.add('hidden'); openAccount('signup', 'worker'); toast('Create a worker account to apply.'); return; }
        if (state.role !== 'worker') { toast('Only worker accounts can apply to opportunities.'); return; }
        if (state.applications.some((application) => String(application.jobId) === String(state.activeJob.id))) { toast('You already applied to this opportunity.'); return; }
        if (state.activeJob.applicationMethod === 'form') {
            document.querySelector('#applicationFormJobTitle').textContent = `Apply for ${state.activeJob.title}`;
            document.querySelector('#applicationFormPrompt').textContent = state.activeJob.applicationQuestion || 'Tell the client why you are a good fit for this role.';
            document.querySelector('#applicationFormAnswer').value = '';
            document.querySelector('#jobApplicationFormModal').classList.remove('hidden');
            return;
        }
        if (!state.resume) { openResumeUpload(); return; }
        submitApplication();
    });
    document.querySelector('#continueJobApplicationFormBtn').addEventListener('click', () => {
        const answer = document.querySelector('#applicationFormAnswer').value.trim();
        if (!answer) {
            toast('Complete the application form before continuing.');
            return;
        }
        pendingApplicationAnswer = answer;
        document.querySelector('#jobApplicationFormModal').classList.add('hidden');
        if (!state.resume) {
            openResumeUpload();
            return;
        }
        submitApplication();
    });
    initResumeUpload();
    window.addEventListener('jobs:updated', renderJobs);
    window.addEventListener('auth:updated', loadPostedJobs);
    window.setInterval(loadPostedJobs, 15000);
    renderJobs();
    loadPostedJobs();
}

async function loadPostedJobs() {
    if (!state.user || loadingPostedJobs) return;
    loadingPostedJobs = true;
    try {
        const payload = await authRequest('/jobs', { cache: 'no-store' });
        state.clientJobs = payload.jobs;
        renderJobs();
        window.dispatchEvent(new Event('jobs:loaded'));
    } catch (error) {
        toast(error.message);
    } finally {
        loadingPostedJobs = false;
    }
}
