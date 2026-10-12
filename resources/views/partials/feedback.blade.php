<section id="feedback" class="screen feedback-screen">
    <div class="feedback-card">
        <p class="tiny-label">YOUR VOICE MATTERS</p>
        <h1>Share your feedback</h1>
        <p class="feedback-intro">Tell us what is working well or what we can improve. Your feedback helps make FlexWork better for everyone.</p>
        <form id="feedbackForm" class="feedback-form">
            <label for="feedbackCategory">Feedback type</label>
            <select id="feedbackCategory" name="category" required>
                <option value="general">General feedback</option>
                <option value="issue">Report a problem</option>
                <option value="suggestion">Suggest an improvement</option>
            </select>
            <label for="feedbackRating">How would you rate your experience?</label>
            <select id="feedbackRating" name="rating" required>
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Okay</option>
                <option value="2">2 - Poor</option>
                <option value="1">1 - Very poor</option>
            </select>
            <label for="feedbackMessage">Your feedback</label>
            <textarea id="feedbackMessage" name="message" rows="6" minlength="10" maxlength="2000" required placeholder="Share details that will help us understand your feedback (10–2000 characters)."></textarea>
            <p id="feedbackStatus" class="feedback-status" role="status" aria-live="polite" hidden></p>
            <button class="pill-btn pill-orange" type="submit">Send feedback</button>
        </form>
    </div>
</section>
