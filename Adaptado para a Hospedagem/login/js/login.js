// Importa a biblioteca da supabase ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- INICIALIZAÇÃO DO SUPABASE ---
const SUPABASE_URL = 'https://qbzmtgbyrsprpsiinaxe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiem10Z2J5cnNwcnBzaWluYXhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MTkxNTIsImV4cCI6MjA2NjM5NTE1Mn0.UXZwlslucVNAgO4Uxnc1A-x7dvluyYeojEkwHl6VMLc';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- CÓDIGO PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {

    // --- SELETORES DE ELEMENTOS ---
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');

    // --- FUNÇÕES AUXILIARES DE UI ---
    function showMessage(message, type) {
        messageText.textContent = message;
        messageBox.className = 'message-box';
        messageBox.classList.add(type);
        messageBox.classList.remove('hidden');
    }

    function hideMessage() {
        messageBox.classList.add('hidden');
    }

    // --- LÓGICA DO FORMULÁRIO ---
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 
        hideMessage();
        let isValid = true;

        if (!emailInput.value.trim()) {
            emailError.textContent = 'O e-mail ou nome de usuário é obrigatório.';
            emailError.classList.remove('hidden');
            isValid = false;
        } else {
            emailError.classList.add('hidden');
        }

        if (!passwordInput.value.trim()) {
            passwordError.textContent = 'A senha é obrigatória.';
            passwordError.classList.remove('hidden');
            isValid = false;
        } else {
            passwordError.classList.add('hidden');
        }

        if (isValid) {
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });
                if (error) { throw new Error('Credenciais inválidas. Por favor, tente novamente.'); }

                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('role, status')
                    .eq('id', data.user.id)
                    .single();
                if (profileError) { throw new Error('Erro ao carregar seu perfil. Tente novamente.'); }

                if (profileData && profileData.status === 'Bloqueado') {
                    await supabase.auth.signOut();
                    throw new Error('Seu acesso está bloqueado. Por favor, entre em contato com o suporte.');
                }

                // CORREÇÃO: Usando caminhos relativos para a raiz do site.
                if (profileData && profileData.role === 'admin') {
                    showMessage('Login bem-sucedido! Redirecionando...', 'success');
                    setTimeout(() => { window.location.href = '/admin/'; }, 1500);
                } else if (profileData && profileData.role === 'client') {
                    showMessage('Login bem-sucedido! Redirecionando...', 'success');
                    setTimeout(() => { window.location.href = '/client/'; }, 1500);
                } else {
                    await supabase.auth.signOut();
                    throw new Error('Seu perfil não está configurado corretamente. Entre em contato com o suporte.');
                }
            } catch (err) {
                showMessage(err.message, 'error');
            }
        }
    });

    // --- EVENTOS DE INPUT ---
    emailInput.addEventListener('input', () => emailError.classList.add('hidden'));
    passwordInput.addEventListener('input', () => passwordError.classList.add('hidden'));
});
