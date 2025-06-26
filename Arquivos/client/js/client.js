// Importa a biblioteca da supabase ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- INICIALIZAÇÃO DO SUPABASE ---
const SUPABASE_URL = 'https://qbzmtgbyrsprpsiinaxe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiem10Z2J5cnNwcnBzaWluYXhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MTkxNTIsImV4cCI6MjA2NjM5NTE1Mn0.UXZwlslucVNAgO4Uxnc1A-x7dvluyYeojEkwHl6VMLc';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- CÓDIGO PRINCIPAL ---
document.addEventListener('DOMContentLoaded', async () => {

    // --- SELETORES ---
    const logoutButton = document.getElementById('logoutButton');
    const fullscreenButton = document.getElementById('fullscreenButton');
    const radioPlayer = document.getElementById('radioPlayer');
    const dailyMessageBox = document.getElementById('dailyMessageBox');
    const dailyMessageText = document.getElementById('dailyMessageText');
    const clientCompanyName = document.getElementById('clientCompanyName');
    const clientWelcomeMessage = document.getElementById('clientWelcomeMessage');
    
    // --- LÓGICA DE CARREGAMENTO ---
    async function loadClientData() {
        const { data: { user } } = await supabase.auth.getUser();

        // CORREÇÃO: Usando caminho absoluto
        if (!user) { window.location.href = '/login/'; return; }

        try {
            const { data: profile, error: profileError } = await supabase.from('profiles').select('name, radio_link, welcome_message, last_access, access_count, role, status').eq('id', user.id).single();
            if (profileError || !profile || profile.role !== 'client') { throw new Error('Acesso negado.'); }
            if (profile.status === 'Bloqueado') { throw new Error('Seu acesso está bloqueado.'); }

            clientCompanyName.textContent = profile.name || 'Sua Empresa';
            clientWelcomeMessage.textContent = profile.welcome_message || 'Desfrute da sua programação!';
            radioPlayer.src = profile.radio_link || 'https://radioindoor.com.br/radio/demonstracao';

            const updatedAccessCount = (profile.access_count || 0) + 1;
            await supabase.from('profiles').update({ last_access: new Date().toISOString(), access_count: updatedAccessCount }).eq('id', user.id);
                
        } catch (err) {
            M.toast({ html: err.message, classes: 'red darken-2' });
            setTimeout(() => {
                supabase.auth.signOut();
                // CORREÇÃO: Usando caminho absoluto
                window.location.href = '/login/';
            }, 3000);
        }
    }
    
    async function loadDailyMessage() {
        try {
            const { data: settings } = await supabase.from('settings').select('daily_message').eq('key', 'global_daily_message').single();
            if (settings && settings.daily_message) {
                dailyMessageText.textContent = settings.daily_message;
                dailyMessageBox.classList.remove('hidden');
            }
        } catch(err) {
            console.error('Erro ao buscar mensagem do dia:', err.message);
        }
    }

    // --- EVENT LISTENERS ---
    logoutButton.addEventListener('click', async () => {
        M.toast({ html: 'Deslogando...', classes: 'blue' });
        await supabase.auth.signOut();
        // CORREÇÃO: Usando caminho absoluto
        window.location.href = '/login/';
    });

    fullscreenButton.addEventListener('click', () => {
        if (radioPlayer.requestFullscreen) {
            radioPlayer.requestFullscreen();
        } else {
            M.toast({ html: 'Seu navegador não suporta tela cheia.', classes: 'orange' });
        }
    });

    // --- CHAMADAS INICIAIS ---
    await loadClientData();
    await loadDailyMessage();
});
