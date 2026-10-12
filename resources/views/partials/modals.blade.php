

<div class="modal hidden" id="accountModal" role="dialog" aria-modal="true" aria-labelledby="accountTitle" tabindex="-1">
    <div class="modal-card account-card">
        <button class="close-btn" data-close="accountModal" type="button" aria-label="Close sign in dialog">&times;</button>
        <a class="account-brand" href="/" aria-label="FlexWork home"><img src="{{ asset('images/flexwork-logo.png') }}" alt=""><span>FLEXWORK</span></a>
        <h3 id="accountTitle">Welcome back</h3>
        <p id="accountCopy" class="account-copy">Sign in to your FlexWork account.</p>
        <div class="account-switch" role="tablist" aria-label="Authentication">
            <button id="signInTab" class="active" type="button" role="tab" aria-selected="true" aria-controls="signinPanel">Sign In</button>
            <button id="signUpTab" type="button" role="tab" aria-selected="false" aria-controls="signupPanel">Create Account</button>
        </div>
        <section id="signinPanel" class="account-panel" role="tabpanel" aria-labelledby="signInTab">
            <form id="signinForm" class="account-form" novalidate>
                <label>Email Address<input id="signinEmail" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label>
                <label>Password<span class="password-field"><input id="signinPassword" name="password" type="password" autocomplete="current-password" aria-label="Password" required placeholder="Your password"><button class="password-visibility" type="button" data-toggle-password="signinPassword" aria-label="Show password">Show</button></span></label>
                <button id="forgotPassword" class="text-action" type="button">Forgot password?</button>
                <p class="auth-error" id="signinError" role="alert" aria-live="polite" hidden></p>
                <button class="auth-submit" type="submit">Sign In</button>
            </form>
            <div class="auth-divider"><span>or</span></div>
            <button class="google-button" type="button" data-google-oauth="signin"><svg aria-hidden="true" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.8 27.8a12 12 0 0 1 0-7.6V15H5.9a20 20 0 0 0 0 18Z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.9 15l6.9 5.2C14.4 15.5 18.8 12 24 12Z"/></svg>Continue with Google</button>
            <p class="auth-switch-copy">New to FlexWork? <button type="button" data-auth-tab="signup">Create an account</button></p>
        </section>
        <section id="signupPanel" class="account-panel" role="tabpanel" aria-labelledby="signUpTab" hidden>
            <form id="signupForm" class="account-form" novalidate>
                <label>Full Name<input id="accountName" name="name" type="text" autocomplete="name" maxlength="255" required placeholder="Your full name"></label>
                <label>Username<input id="accountUsername" name="username" type="text" autocomplete="username" minlength="3" maxlength="30" pattern="[A-Za-z0-9_-]+" required placeholder="Choose a username"></label>
                <label>Email Address<input id="accountEmail" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label>
                <label>Contact Number<input id="accountContact" name="contact_number" type="tel" autocomplete="tel" required placeholder="+63 917 123 4567"></label>
                <label>Password<span class="password-field"><input id="accountPassword" name="password" type="password" autocomplete="new-password" aria-label="Password" minlength="8" required aria-describedby="passwordRequirements" placeholder="Create a password"><button class="password-visibility" type="button" data-toggle-password="accountPassword" aria-label="Show password">Show</button></span></label>
                <p id="passwordRequirements" class="field-hint">Use at least 8 characters, including letters and numbers.</p>
                <label>Password Confirmation<span class="password-field"><input id="accountPasswordConfirmation" name="password_confirmation" type="password" autocomplete="new-password" aria-label="Password Confirmation" minlength="8" required placeholder="Confirm your password"><button class="password-visibility" type="button" data-toggle-password="accountPasswordConfirmation" aria-label="Show password">Show</button></span></label>
                <fieldset class="role-fieldset">
                    <legend>Account Type</legend>
                    <div class="role-options">
                        <button class="role-option" data-role-choice="client" type="button" aria-pressed="false"><strong>Client</strong><span>I am hiring talent.</span></button>
                        <button class="role-option" data-role-choice="worker" type="button" aria-pressed="false"><strong>Worker</strong><span>I am looking for work.</span></button>
                    </div>
                </fieldset>
                <p class="auth-error" id="signupError" role="alert" aria-live="polite" hidden></p>
                <button class="auth-submit" type="submit">Create Account</button>
            </form>
            <div class="auth-divider"><span>or</span></div>
            <button class="google-button" type="button" data-google-oauth="signup"><svg aria-hidden="true" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.8 27.8a12 12 0 0 1 0-7.6V15H5.9a20 20 0 0 0 0 18Z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.9 15l6.9 5.2C14.4 15.5 18.8 12 24 12Z"/></svg>Continue with Google</button>
            <p class="auth-switch-copy">Already have an account? <button type="button" data-auth-tab="signin">Sign in</button></p>
        </section>
        <section id="forgotPanel" class="account-panel" hidden>
            <h4>Reset your password</h4>
            <p class="account-copy">Enter your email and, if an account matches, we’ll send a secure reset link.</p>
            <form id="forgotForm" class="account-form" novalidate>
                <label>Email Address<input id="forgotEmail" type="email" autocomplete="email" required placeholder="you@example.com"></label>
                <p class="auth-error" id="forgotError" role="alert" aria-live="polite" hidden></p>
                <p class="auth-success" id="forgotSuccess" role="status" hidden></p>
                <button class="auth-submit" type="submit">Send Reset Link</button>
            </form>
            <button class="text-action" type="button" data-auth-tab="signin">Back to Sign In</button>
        </section>
        <section id="resetPanel" class="account-panel" hidden>
            <h4>Choose a new password</h4>
            <form id="resetForm" class="account-form" novalidate>
                <input id="resetToken" type="hidden">
                <input id="resetEmail" type="hidden">
                <label>New Password<span class="password-field"><input id="resetPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="New password"><button class="password-visibility" type="button" data-toggle-password="resetPassword" aria-label="Show password">Show</button></span></label>
                <label>Confirm New Password<input id="resetPasswordConfirmation" type="password" autocomplete="new-password" minlength="8" required placeholder="Confirm new password"></label>
                <p class="auth-error" id="resetError" role="alert" aria-live="polite" hidden></p>
                <button class="auth-submit" type="submit">Reset Password</button>
            </form>
        </section>
    </div>
</div>
<div class="modal hidden" id="jobModal">
    <div class="modal-card">
        <button class="close-btn" data-close="jobModal" type="button">&times;</button>
        <p class="tiny-label">JOB POST</p><h3 id="jobTitle">Job</h3>
        <p id="jobCopy"></p>
        <div id="jobMeta"></div>
        <div id="jobDetails" class="job-details hidden">
            <section class="job-detail-section">
                <h4>JOB OVERVIEW</h4>
                <p id="jobOverview"></p>
            </section>
            <section class="job-detail-section">
                <h4>HOW TO APPLY</h4>
                <p id="jobApplicationInstructions"></p>
                <p id="jobApplicationMethod" class="job-application-method"></p>
            </section>
            <section class="job-detail-section">
                <h4>POSTED BY</h4>
                <p id="jobPoster"></p>
                <button class="mini-btn" id="viewClientProfileBtn" type="button" hidden>VIEW CLIENT PROFILE</button>
            </section>
        </div>
        <div class="modal-actions">
            <button class="pill-btn pill-dark" id="starJobBtn" type="button">☆ Star</button>
            <button class="pill-btn pill-orange" id="applyBtn" type="button">See more &rarr;</button></div></div></div>
<div class="modal hidden" id="jobApplicationFormModal">
    <div class="modal-card">
        <button class="close-btn" data-close="jobApplicationFormModal" type="button">&times;</button>
        <p class="tiny-label">APPLICATION FORM</p>
        <h3 id="applicationFormJobTitle">Apply for this job</h3>
        <p id="applicationFormPrompt"></p>
        <label class="application-answer-label" for="applicationFormAnswer">Your response
            <textarea id="applicationFormAnswer" required maxlength="2000" rows="5" placeholder="Write your response"></textarea>
        </label>
        <div class="modal-actions">
            <button class="pill-btn pill-dark" data-close="jobApplicationFormModal" type="button">Cancel</button>
            <button class="pill-btn pill-orange" id="continueJobApplicationFormBtn" type="button">Continue to resume &rarr;</button>
        </div>
    </div>
</div>
<div class="modal hidden" id="resumeUploadModal">
    <div class="modal-card resume-upload-card">
        <button class="close-btn" data-close="resumeUploadModal" type="button">&times;</button>
        <p class="tiny-label">APPLICATION REQUIREMENT</p>
        <h3>Upload your resume</h3>
        <p>Attach a resume before applying to <strong id="resumeJobTitle">this opportunity</strong>.</p>
        <div class="resume-upload-box">
            <div class="resume-file-icon">PDF</div>
            <div><strong id="resumeUploadName">No file selected</strong><span>PDF, DOC, or DOCX · Maximum 4 MB</span></div></div>
            <input id="jobResumeInput" type="file" accept=".pdf,.doc,.docx" hidden>
            <button class="pill-btn pill-outline" id="chooseJobResumeBtn" type="button">Choose resume</button>
            <div class="modal-actions">
                <button class="pill-btn pill-dark" data-close="resumeUploadModal" type="button">Cancel</button>
                <button class="pill-btn pill-orange" id="continueApplicationBtn" type="button" disabled>Continue application &rarr;</button></div></div></div>
<div class="modal hidden" id="profileModal">
    <div class="modal-card">
        <button class="close-btn" data-close="profileModal" type="button">&times;</button>
        <p class="tiny-label">PROFILE SETTINGS</p>
        <h3>Edit your profile</h3>
        <form id="profileForm" class="account-form">
            <label>Full name<input id="profileFullName" required maxlength="255"></label>
            <label>Professional title<input id="profileTitle" maxlength="120"></label>
            <label>Skills<input id="profileSkills" maxlength="500" placeholder="Separate skills with commas"></label>
            <label>Education<input id="profileEducation" maxlength="500" placeholder="School, degree, or educational background"></label>
            <label>Profile overview<textarea id="profileBio" maxlength="2000" rows="4" placeholder="Share your experience, strengths, or hiring priorities"></textarea></label>
            <label>Date of birth<input id="profileBirthDate" type="date" autocomplete="bday"></label>
            <label>Gender<select id="profileGender"><option value="">Prefer not to say</option><option>Woman</option><option>Man</option><option>Non-binary</option><option>Other</option></select></label>
            <label>Birthplace<input id="profileBirthplace" maxlength="120" placeholder="City or region"></label>
            <button class="pill-btn pill-orange" type="submit">Save profile</button></form></div></div>
<div class="modal hidden" id="verificationModal">
    <div class="modal-card">
        <button class="close-btn" data-close="verificationModal" type="button">&times;</button>
        <p class="tiny-label">PRIVATE IDENTITY VERIFICATION</p>
        <h3>Verify your identity</h3>
        <p>Your ID is stored privately. Workers can view a blurred proof preview on your client profile so identifying details remain obscured.</p>
        <form id="verificationForm" class="account-form">
            <label>Choose a valid ID or school ID<input id="verificationFile" type="file" accept=".jpg,.jpeg,.jfif,.png,.pdf,image/jpeg,image/jfif,image/png,application/pdf" required></label>
            <p class="verification-privacy">Accepted: JPG, JFIF, PNG, or PDF · Maximum 5 MB. Upload only a clear image or scan of your document.</p>
            <div class="modal-actions">
                <button class="pill-btn pill-dark" data-close="verificationModal" type="button">Cancel</button>
                <button class="pill-btn pill-orange" id="submitVerificationBtn" type="submit">Submit securely</button>
            </div>
        </form>
    </div>
</div>
<div class="modal hidden" id="clientDetailsModal" role="dialog" aria-modal="true" aria-labelledby="clientDetailsName">
    <div class="modal-card worker-details-card">
        <button class="close-btn" data-close="clientDetailsModal" type="button" aria-label="Close client profile">&times;</button>
        <div class="worker-details-cover"></div>
        <div class="worker-details-heading">
            <h3 id="clientDetailsName">Client profile</h3>
            <p id="clientDetailsLocation"></p>
        </div>
        <section><h4>Age and gender</h4><p id="clientDetailsPersonal"></p></section>
        <section><h4>Overview</h4><p id="clientDetailsOverview"></p></section>
        <section id="clientIdProofSection" hidden>
            <h4>Identity proof</h4>
            <p>For privacy, the proof is blurred in this preview. Do not capture or redistribute identity documents.</p>
            <button class="mini-btn" id="showClientIdProofBtn" type="button">VIEW BLURRED ID PROOF</button>
            <div class="client-id-proof-frame" id="clientIdProofFrame" hidden></div>
        </section>
        <div class="modal-actions">
            <button class="pill-btn pill-orange" data-close="clientDetailsModal" type="button">Close</button>
        </div>
    </div>
</div>
<div class="modal hidden" id="workerDetailsModal" role="dialog" aria-modal="true" aria-labelledby="workerDetailsName">
    <div class="modal-card worker-details-card">
        <button class="close-btn" data-close="workerDetailsModal" type="button" aria-label="Close worker profile">&times;</button>
        <div class="worker-details-cover"></div>
        <div class="worker-details-heading">
            <img id="workerDetailsAvatar" alt="" hidden>
            <div class="worker-details-placeholder" id="workerDetailsPlaceholder"></div>
            <h3 id="workerDetailsName">Worker profile</h3>
            <p id="workerDetailsTitle"></p>
            <p id="workerDetailsRating"></p>
            <p id="workerDetailsPersonal" class="worker-details-personal"></p>
        </div>
        <section><h4>Overview</h4><p id="workerDetailsDescription"></p></section>
        <section><h4>Top skills</h4><p id="workerDetailsSkills"></p></section>
        <section><h4>Education</h4><p id="workerDetailsEducation"></p></section>
        <div class="modal-actions">
            <button class="pill-btn pill-outline" id="workerDetailsMessage" type="button">Send message</button>
            <button class="pill-btn pill-orange" data-close="workerDetailsModal" type="button">Close</button>
        </div>
    </div>
</div>
<div class="modal hidden" id="postJobModal">
    <div class="modal-card">
        <button class="close-btn" data-close="postJobModal" type="button">&times;</button>
        <p class="tiny-label">CLIENT OPPORTUNITY</p>
        <h3>Post a job</h3>
        <p>Share a clear opportunity so workers can understand the role and apply.</p>
        <form id="postJobForm" class="account-form">
            <label>Job title<input id="postJobTitle" required maxlength="120"></label>
            <label>Category<select id="postJobCategory" required>
                <option>Admin & Virtual Assistants</option>
                <option>Customer Support</option>
                <option>Web & Tech</option>
                <option>Content & Social Media</option>
                <option>Creative & Design</option>
                <option>AI & Automation</option>
                <option>Others</option></select></label>
                <label id="otherCategoryLabel" hidden>Other category<input id="postJobOtherCategory" maxlength="80"></label>
                <label>Location<input id="postJobPlace" placeholder="Remote or city" required maxlength="120"></label>
                <label>Work type<select id="postJobType" required>
                    <option value="fulltime">Full-time</option>
                    <option value="parttime">Part-time</option>
                    <option value="gig">Gig</option></select></label>
                    <label>Budget / salary<input id="postJobBudget" placeholder="e.g. ₱30k–₱40k" required maxlength="80"></label>
                    <label class="post-job-wide">Description<textarea id="postJobDescription" required maxlength="1000"></textarea></label>
                            <label class="post-job-wide">How to apply<textarea id="postJobApplicationInstructions" maxlength="1000" placeholder="Tell workers what to include or expect when applying"></textarea></label>
                            <label class="post-job-wide">Application process<select id="postJobApplicationMethod">
                        <option value="resume">Apply directly with a resume</option>
                        <option value="form">Complete an application form, then submit a resume</option>
                    </select></label>
                            <label class="post-job-wide" id="postJobApplicationQuestionLabel" hidden>Application form question or instructions<textarea id="postJobApplicationQuestion" maxlength="500" placeholder="For example: Describe your relevant experience"></textarea></label>
                            <fieldset class="post-job-skills post-job-wide"><legend>Skills</legend><div class="skill-options"><label><input type="checkbox" value="Communication"> Communication</label>
                    <label><input type="checkbox" value="Customer Service"> Customer Service</label>
                    <label><input type="checkbox" value="Microsoft Office"> Microsoft Office</label>
                    <label><input type="checkbox" value="JavaScript"> JavaScript</label>
                    <label><input type="checkbox" value="Design"> Design</label>
                    <label><input type="checkbox" value="Others" id="otherSkillChoice"> Others</label></div>
                            <input id="postJobOtherSkill" placeholder="Specify other skills" maxlength="100" hidden></fieldset>
                            <button class="pill-btn pill-orange post-job-wide" type="submit">Publish job &rarr;</button></form></div></div>
<div class="modal hidden" id="resumePreviewModal">
    <div class="modal-card resume-preview-card">
        <button class="close-btn" data-close="resumePreviewModal" type="button">&times;</button>
        <p class="tiny-label">RESUME PREVIEW</p>
        <h3 id="previewResumeTitle">Resume</h3>
        <div class="resume-preview-frame" id="resumePreviewFrame"></div>
        <div class="modal-actions">
            <button class="pill-btn pill-dark" data-close="resumePreviewModal" type="button">Close</button>
            <button class="pill-btn pill-orange" id="previewDownloadBtn" type="button">Download resume</button></div></div></div>
