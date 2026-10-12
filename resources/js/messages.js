import { state, toast } from './state';
import { authRequest, show } from './navigation';

let activeContact = null;
let messageFilter = 'all';
let loadingConversations = false;
let loadingThread = false;

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}[character]));

function renderConversationList() {
    const query = document.querySelector('#messageSearch').value.trim().toLowerCase();
    const conversations = state.messages.filter((conversation) => {
        const matchesSearch = `${conversation.name} ${conversation.sub} ${conversation.last_message || ''}`.toLowerCase().includes(query);
        const matchesFilter = messageFilter !== 'unread' || conversation.unread_count > 0;
        return matchesSearch && matchesFilter;
    });

    document.querySelector('#conversationList').innerHTML = conversations.length
        ? conversations.map((conversation) => `<button class="conversation ${Number(state.selectedChat) === conversation.id ? 'active' : ''}" data-chat="${conversation.id}" type="button" aria-current="${Number(state.selectedChat) === conversation.id ? 'true' : 'false'}"><span class="conversation-avatar">${escapeHtml(conversation.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase())}</span><span class="conversation-copy"><strong>${escapeHtml(conversation.name)}</strong><p>${escapeHtml(conversation.sub || ucfirst(conversation.role))}</p><small>${escapeHtml(conversation.last_message || 'Start a conversation')}</small></span>${conversation.unread_count ? `<span class="conversation-unread">${conversation.unread_count}</span>` : ''}</button>`).join('')
        : `<p class="empty-chat">${query ? 'No conversations match your search.' : messageFilter === 'unread' ? 'You have no unread messages.' : 'No conversations yet. Browse a worker profile and send a message to start a conversation.'}</p>`;

    document.querySelectorAll('[data-chat]').forEach((button) => button.addEventListener('click', () => {
        state.selectedChat = Number(button.dataset.chat);
        activeContact = state.messages.find((conversation) => conversation.id === state.selectedChat) || null;
        renderConversationList();
        loadThread(state.selectedChat);
    }));
}

function ucfirst(value = '') {
    return value ? value[0].toUpperCase() + value.slice(1) : '';
}

function renderThread(contact, messages) {
    activeContact = contact;
    document.querySelector('#chatName').textContent = contact.name;
    document.querySelector('#chatSub').textContent = `${ucfirst(contact.role)}${contact.sub && contact.sub.toLowerCase() !== contact.role ? ` · ${contact.sub}` : ''}`;
    const container = document.querySelector('#chatMessages');
    const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;

    container.innerHTML = messages.length
        ? messages.map((message) => `<div class="bubble-wrap ${message.mine ? 'me' : 'them'}"><div class="bubble ${message.mine ? 'me' : 'them'}">${escapeHtml(message.body)}<time>${escapeHtml(new Date(message.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }))}</time></div></div>`).join('')
        : '<p class="empty-chat">Send a message to start this conversation.</p>';
    if (wasAtBottom || messages.length === 1) container.scrollTop = container.scrollHeight;

    document.querySelector('#chatInput').disabled = false;
    document.querySelector('#chatForm button[type="submit"]').disabled = false;
}

async function loadThread(peerId) {
    if (!state.user || !peerId || loadingThread) return;
    loadingThread = true;
    try {
        const payload = await authRequest(`/messages/${peerId}`, { cache: 'no-store' });
        if (Number(state.selectedChat) !== Number(peerId)) return;
        renderThread(payload.contact, payload.messages);
        const conversation = state.messages.find((item) => item.id === Number(peerId));
        if (conversation) conversation.unread_count = 0;
        renderConversationList();
    } catch (error) {
        document.querySelector('#chatMessages').innerHTML = `<p class="message-error">${escapeHtml(error.message)}</p>`;
        toast(error.message);
    } finally {
        loadingThread = false;
    }
}

async function loadConversations() {
    if (!state.user || loadingConversations) return;
    loadingConversations = true;
    try {
        const payload = await authRequest('/messages', { cache: 'no-store' });
        state.messages = payload.conversations;

        if (activeContact && !state.messages.some((conversation) => conversation.id === activeContact.id)) {
            state.messages.unshift({ ...activeContact, last_message: '', unread_count: 0 });
        }

        if (!state.selectedChat && state.messages.length) {
            state.selectedChat = state.messages[0].id;
        }
        if (state.selectedChat && !activeContact) {
            activeContact = state.messages.find((conversation) => conversation.id === Number(state.selectedChat)) || null;
        }

        renderConversationList();
        if (state.selectedChat) await loadThread(state.selectedChat);
        else {
            activeContact = null;
            document.querySelector('#chatName').textContent = 'Select a conversation';
            document.querySelector('#chatSub').textContent = 'Your messages appear here.';
            document.querySelector('#chatMessages').innerHTML = '<p class="empty-chat">Browse workers and send a message to start a conversation.</p>';
            document.querySelector('#chatInput').disabled = true;
            document.querySelector('#chatForm button[type="submit"]').disabled = true;
        }
    } catch (error) {
        document.querySelector('#conversationList').innerHTML = `<p class="message-error">Messages could not be loaded. ${escapeHtml(error.message)}</p>`;
        toast(error.message);
    } finally {
        loadingConversations = false;
    }
}

function openConversation(peerId) {
    state.selectedChat = Number(peerId);
    activeContact = state.messages.find((conversation) => conversation.id === Number(peerId)) || null;
    show('messages');
    showMessages();
    loadThread(Number(peerId));
    loadConversations();
}

function showMessages() {
    document.querySelector('#chatMessages').innerHTML = '<p class="message-loading">Loading conversation…</p>';
    document.querySelector('#chatInput').disabled = false;
    document.querySelector('#chatForm button[type="submit"]').disabled = false;
}

export function renderMessages() {
    renderConversationList();
}

export function initMessages() {
    window.addEventListener('auth:updated', () => {
        state.messages = [];
        state.selectedChat = null;
        activeContact = null;
        if (state.user) loadConversations();
        else {
            renderConversationList();
            document.querySelector('#chatInput').disabled = true;
            document.querySelector('#chatForm button[type="submit"]').disabled = true;
        }
    });
    window.addEventListener('messages:open', (event) => openConversation(event.detail.peerId));
    window.addEventListener('screen:changed', (event) => {
        if (event.detail === 'messages') loadConversations();
    });
    document.querySelector('#messageSearch').addEventListener('input', renderConversationList);
    document.querySelectorAll('[data-message-filter]').forEach((button) => button.addEventListener('click', () => {
        messageFilter = button.dataset.messageFilter;
        document.querySelectorAll('[data-message-filter]').forEach((item) => item.classList.toggle('active', item === button));
        renderConversationList();
    }));
    document.querySelector('#chatForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const input = document.querySelector('#chatInput');
        const body = input.value.trim();
        if (!body || !state.selectedChat || !state.user) return;

        const sendButton = event.currentTarget.querySelector('[type="submit"]');
        sendButton.disabled = true;
        try {
            await authRequest('/messages', {
                method: 'POST',
                body: JSON.stringify({ recipient_id: Number(state.selectedChat), body }),
            });
            input.value = '';
            await loadConversations();
        } catch (error) {
            toast(error.message);
        } finally {
            sendButton.disabled = false;
        }
    });
    renderConversationList();
    if (state.user) loadConversations();
    window.setInterval(() => {
        if (state.user) loadConversations();
    }, 4000);
}
