import { authRequest } from './navigation';
import { toast } from './state';

export function initFeedback() {
    const form = document.querySelector('#feedbackForm');
    const status = document.querySelector('#feedbackStatus');
    const submit = form.querySelector('[type=submit]');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;

        submit.disabled = true;
        submit.textContent = 'Sending feedback…';
        status.hidden = true;
        status.textContent = '';

        try {
            const payload = await authRequest('/feedback', {
                method: 'POST',
                body: JSON.stringify({
                    category: form.elements.category.value,
                    rating: Number(form.elements.rating.value),
                    message: form.elements.message.value.trim(),
                }),
            });
            form.reset();
            status.textContent = payload.message;
            status.hidden = false;
            toast(payload.message);
        } catch (error) {
            status.textContent = error.message;
            status.hidden = false;
        } finally {
            submit.disabled = false;
            submit.textContent = 'Send feedback';
        }
    });
}
