<section id="profile" class="screen">
    <div class="profile-cover">
        <div class="profile-cover-content">
            <p class="tiny-label">WORKBRIDGE MEMBER</p>
            <h1 id="profileBannerName">Name not specified</h1>
            <p id="profileBannerTitle">Job description not specified</p>
            <span class="profile-verification" id="profileVerificationBadge"><b>0</b> ID PROOF</span>
        </div>
    </div>
    <div class="profile-page">
        <div class="profile-layout">
            <aside class="profile-sidebar">
                <button class="profile-avatar" id="profilePictureBtn" type="button" aria-label="Upload profile picture">
                    <svg id="profileAvatarPlaceholder" viewBox="0 0 120 120" aria-hidden="true">
                        <circle cx="60" cy="60" r="60" fill="#f3f3f3"/>
                        <path d="M60 20c-12 0-20 10-20 23 0 14 8 25 20 25s20-11 20-25c0-13-8-23-20-23Zm-29 78c2-15 11-23 23-27l6 8 6-8c12 4 21 12 23 27-17 9-41 9-58 0Z" fill="none" stroke="#94999c" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="m54 73 6 8 6-8m-6 8v22" fill="none" stroke="#50a6b4" stroke-width="3.5" stroke-linecap="round"/>
                    </svg>
                    <img id="profileAvatarImage" alt="Profile picture" hidden>
                    <span class="profile-avatar-edit" id="profileAvatarEdit">Upload photo</span>
                </button>
                <input id="profilePictureInput" type="file" accept=".jfif,image/jfif,image/jpeg,image/png,image/webp" hidden>
                <div class="profile-name" id="profileName">Guest User</div>
                <div class="profile-role" id="profileRole">Not signed in</div>
                <button class="profile-action" id="editProfileBtn" type="button"><span aria-hidden="true">↗</span> Edit profile</button>
                <button class="profile-action" id="verificationBtn" type="button"><span aria-hidden="true">◇</span> Verification</button>
                <button class="profile-action" id="resumeBtn" type="button"><span aria-hidden="true">↑</span> Upload resume</button>
                <div class="profile-tools">
                    <div class="profile-nav" id="profileNav">
                        <button class="profile-tab active" data-profile="applications" type="button">My Jobs</button><button class="profile-tab client-only" data-profile="posted" type="button">Posted Jobs</button><button class="profile-tab client-only" data-profile="received" type="button">Applications Received</button><button class="profile-tab" data-profile="starred" type="button">Starred</button><button class="profile-tab" data-profile="pending" type="button">Pending Review</button><button class="profile-tab" data-profile="rejected" type="button">Rejected Applications</button><button class="profile-tab" data-profile="resume" type="button">Resume</button>
                    </div>
                    <button class="small-dark-btn client-only" id="postJobBtn" type="button">Post a job</button><button class="small-dark-btn client-only" id="clientMessagesBtn" type="button">Review applicants</button><button class="small-dark-btn" id="profileSignIn" type="button">Sign in / Create account</button><button class="small-dark-btn logout-btn" id="logoutBtn" type="button" hidden>Log out</button>
                </div>
            </aside>
            <div class="profile-main">
                <div class="profile-details">
                    <div class="profile-fact profile-description-fact worker-only"><h2>ABOUT THE WORKER</h2><p id="profileDescriptionText">Add a short description about your experience and the work you do.</p></div>
                    <div class="profile-fact worker-only"><div class="profile-fact-heading"><h2>EDUCATION</h2><button id="editEducationBtn" type="button">Edit</button></div><p id="profileEducationText">Not specified</p></div>
                    <div class="profile-fact worker-only"><h2>TOP SKILLS</h2><p id="profileSkillsText">Not specified</p></div>
                </div>
                <section class="client-ratings worker-only" aria-labelledby="clientRatingsHeading">
                    <h2 id="clientRatingsHeading" class="profile-section-label">CLIENTS' RATINGS ON YOU</h2>
                    <div class="ratings-card">
                        <div class="rating-stars" aria-label="No client ratings yet"><span>☆</span><span>☆</span><span>☆</span><span>☆</span><span>☆</span></div>
                        <p id="clientRatingSummary">No client ratings yet</p>
                    </div>
                </section>
                <section class="profile-management" aria-label="Jobs and applications">
                    <div class="profile-panel active" id="panel-applications"><div class="panel-title"><h3 id="applicationsTitle">My applications</h3><span id="myJobsCount">0 items</span></div><div class="list" id="myJobsList"></div></div>
                    <div class="profile-panel" id="panel-posted"><div class="panel-title"><h3>Posted Jobs</h3><span>Client job posts</span></div><div class="list" id="postedJobsList"></div></div>
                    <div class="profile-panel" id="panel-received"><div class="panel-title"><h3>Applications Received</h3><span>Worker applications</span></div><div class="list" id="receivedList"></div></div>
                    <div class="profile-panel" id="panel-starred"><div class="panel-title"><h3>Starred</h3><span id="starredCount">0 items</span></div><div class="list" id="starredList"></div></div>
                    <div class="profile-panel" id="panel-pending"><div class="panel-title"><h3>Pending Review</h3><span>Application status</span></div><div class="list" id="pendingList"></div></div>
                    <div class="profile-panel" id="panel-rejected"><div class="panel-title"><h3>Rejected Applications</h3><span>Keep improving and try again</span></div><div class="list" id="rejectedList"></div></div>
                    <div class="profile-panel" id="panel-resume"><div class="panel-title"><h3>Resume</h3><span>Attached to applications</span></div><div class="resume-box"><div><strong id="resumeTitle">No resume uploaded</strong><p id="resumeMeta">Upload a PDF, DOC, or DOCX resume.</p></div><div class="resume-actions"><button class="mini-btn" id="viewResumeBtn" type="button" hidden>View</button><button class="mini-btn" id="downloadResumeBtn" type="button" hidden>Download</button><button class="mini-btn" id="resumePanelBtn" type="button">Upload / update</button></div></div><input id="resumeFileInput" type="file" accept=".pdf,.doc,.docx" hidden></div>
                </section>
            </div>
        </div>
    </div>
</section>
