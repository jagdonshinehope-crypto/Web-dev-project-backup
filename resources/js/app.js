import './bootstrap';
import '../css/app.css';
import { state } from './state';
import { closeAccount, initNavigation, updateHeader, show } from './navigation';
import { initSkills, renderSkill } from './skills';
import { initOpportunities } from './opportunities';
import { initProfile, renderProfile } from './profile';
import { initMessages } from './messages';
import { initFeedback } from './feedback';

document.addEventListener('DOMContentLoaded', () => {
	initNavigation();
	initSkills();
	initOpportunities();
	initProfile();
	initMessages();
	initFeedback();
	renderSkill(state.skill);
	show('welcome');
	renderProfile();
	updateHeader();

	document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => {
		if (button.dataset.close === 'accountModal') closeAccount();
		else document.querySelector(`#${button.dataset.close}`).classList.add('hidden');
	}));
	document.querySelectorAll('.modal').forEach((modal) => modal.addEventListener('click', (event) => {
		if (event.target !== modal) return;
		if (modal.id === 'accountModal') closeAccount();
		else modal.classList.add('hidden');
	}));
});
