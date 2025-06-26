// Importa a biblioteca da supabase ---

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- INICIALIZAÇÃO DO SUPABASE ---
const SUPABASE_URL = 'https://qbzmtgbyrsprpsiinaxe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiem10Z2J5cnNwcnBzaWluYXhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MTkxNTIsImV4cCI6MjA2NjM5NTE1Mn0.UXZwlslucVNAgO4Uxnc1A-x7dvluyYeojEkwHl6VMLc';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- CÓDIGO PRINCIPAL ---
document.addEventListener('DOMContentLoaded', async () => {
    
    // --- VARIÁVEIS GLOBAIS ---
    let allUsers = []; 
    let resolveConfirmationPromise;
    
    // --- INICIALIZAÇÃO DE COMPONENTES MATERIALIZE ---
    const userModalInstance = M.Modal.init(document.getElementById('userModal'), { dismissible: false });
    const confirmationModalInstance = M.Modal.init(document.getElementById('confirmationModal'));
    
    function initializeMaterializeComponents() {
        M.Tabs.init(document.querySelector(".tabs"));
        M.FormSelect.init(document.querySelectorAll('select'));
        M.Datepicker.init(document.querySelectorAll('.datepicker'), {
            format: 'dd/mm/yyyy', autoClose: true, container: document.body,
            i18n: { cancel: 'Cancelar', clear: 'Limpar', months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'], monthsShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], weekdays: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'], weekdaysShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], weekdaysAbbrev: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] }
        });
        M.CharacterCounter.init(document.querySelectorAll('textarea[data-length]'));
        M.Tooltip.init(document.querySelectorAll('.tooltipped'));
    }

    // --- SELETORES DE ELEMENTOS ---
    const userListTableBody = document.getElementById('userListTable');
    const reportTableBody = document.getElementById('reportTable');
    const userForm = document.getElementById('userForm');

    // --- FUNÇÕES DE LÓGICA DE NEGÓCIO ---

    async function fetchUsers() {
        userListTableBody.innerHTML = '';
        userListTableBody.appendChild(createRow('loading'));
        try {
            const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            allUsers = data;
            renderUserList(allUsers);
            updateDashboardStats(allUsers);
            populateReportUserSelect(allUsers);
        } catch (err) {
            userListTableBody.innerHTML = '';
            userListTableBody.appendChild(createRow('error', `Erro ao carregar: ${err.message}`));
        }
    }

    async function handleSaveUser() {
        const userPasswordInput = document.getElementById('userPassword');
        if (!userForm.checkValidity() || (userPasswordInput.hasAttribute('required') && !userPasswordInput.value)) {
            M.toast({ html: 'Preencha os campos obrigatórios.', classes: 'orange' });
            return;
        }

        const editingId = document.getElementById('editingUserId').value;
        const profileData = {
            name: document.getElementById('userName').value.trim(),
            email: document.getElementById('userEmail').value.trim(),
            radio_link: document.getElementById('userRadioLink').value.trim() || null,
            welcome_message: document.getElementById('userWelcomeMessage').value.trim() || null,
            validity_date: M.Datepicker.getInstance(document.getElementById('userValidityDate')).date?.toISOString() || null,
        };
        const userPassword = userPasswordInput.value;

        try {
            if (editingId) {
                // Modo Edição
                const { error } = await supabase.from('profiles').update(profileData).eq('id', editingId);
                if (error) throw error;
                M.toast({ html: 'Perfil atualizado!', classes: 'green' });

                if (userPassword) {
                    if (userPassword.length < 6) {
                        M.toast({ html: `Senha curta. Perfil salvo, mas senha não alterada.`, classes: 'orange', displayLength: 5000 });
                    } else {
                        M.toast({ html: 'Alterando senha...', classes: 'blue' });
                        const { data: funcData, error: funcError } = await supabase.functions.invoke('set-user-password', {
                            body: { userId: editingId, newPassword: userPassword },
                        });
                        if (funcError || funcData.error) throw new Error(funcError?.message || funcData.error);
                        M.toast({ html: 'Senha alterada com sucesso!', classes: 'green' });
                    }
                }
            } else {
                // Modo Criação
                const createData = {
                    email: profileData.email,
                    password: userPassword,
                    profileData: { ...profileData, role: 'client', access_count: 0, status: 'Online' }
                };
                const { data, error } = await supabase.functions.invoke('create-user', { body: createData });
                if (error || data.error) throw new Error(error?.message || data.error);
                M.toast({ html: 'Usuário criado com sucesso!', classes: 'green' });
            }
            fetchUsers();
            userModalInstance.close();
        } catch (err) {
            M.toast({ html: `Erro ao salvar: ${err.message}`, classes: 'red' });
        }
    }
    
    async function handleDeleteUser(userId) {
        const user = allUsers.find(u => u.id === userId);
        if (!user) return;
        
        const confirmed = await showConfirmationModal('Confirmar Exclusão', `Excluir o usuário ${user.name}? A ação não pode ser desfeita.`);
        if (!confirmed) return;

        try {
            M.toast({ html: 'Excluindo...', classes: 'blue' });
            const { data, error } = await supabase.functions.invoke('delete-user', { body: { userId } });
            if (error || data.error) throw new Error(error?.message || data.error);
            M.toast({ html: 'Usuário excluído!', classes: 'green' });
            fetchUsers();
        } catch (err) {
            M.toast({ html: `Erro ao excluir: ${err.message}`, classes: 'red' });
        }
    }

    async function handleBlockUser(userId) {
        const user = allUsers.find(u => u.id === userId);
        if (!user) return;
        const newStatus = user.status === 'Bloqueado' ? 'Online' : 'Bloqueado';
        const actionVerb = newStatus === 'Bloqueado' ? 'bloquear' : 'desbloquear';

        const confirmed = await showConfirmationModal('Confirmar Ação', `Deseja ${actionVerb} o usuário ${user.name}?`);
        if(!confirmed) return;
        
        try {
             const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
             if (error) throw error;
             M.toast({ html: `Usuário ${actionVerb}!`, classes: 'green' });
             fetchUsers();
        } catch(err) {
            M.toast({ html: `Erro: ${err.message}`, classes: 'red' });
        }
    }

    async function fetchAndApplyDailyMessage() {
        try {
            const { data, error } = await supabase.from('settings').select('daily_message').eq('key', 'global_daily_message').single();
            if (error && error.code !== 'PGRST116') throw error;
            document.getElementById('dailyMessage').value = data?.daily_message || '';
            M.textareaAutoResize(document.getElementById('dailyMessage'));
            M.updateTextFields();
        } catch (err) {
            console.error("Erro ao buscar mensagem do dia:", err);
        }
    }

    async function saveDailyMessage(event) {
        event.preventDefault();
        try {
            const message = document.getElementById('dailyMessage').value.trim();
            const { error } = await supabase.from('settings').upsert({ key: 'global_daily_message', daily_message: message }, { onConflict: 'key' });
            if (error) throw error;
            M.toast({ html: 'Mensagem salva!', classes: 'green' });
        } catch(err) {
             M.toast({ html: `Erro ao salvar: ${err.message}`, classes: 'red' });
        }
    }

    async function fetchReports(filters = {}) {
        reportTableBody.innerHTML = '';
        reportTableBody.appendChild(createRow('loading'));
        try {
           let query = supabase.from('profiles').select('*');
           if (filters.userId && filters.userId !== 'all') query = query.eq('id', filters.userId);
           if (filters.startDate) query = query.gte('last_access', filters.startDate.toISOString());
           if (filters.endDate) query = query.lte('last_access', filters.endDate.toISOString());
           query = query.order('last_access', { ascending: false });

           const { data, error } = await query;
           if(error) throw error;
           renderReportTable(data);
        } catch(err) {
           reportTableBody.innerHTML = '';
           reportTableBody.appendChild(createRow('error', `Erro ao gerar relatório.`));
        }
    }

    function downloadPdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const body = [];
        reportTableBody.querySelectorAll('tr').forEach(tr => {
            if (tr.querySelector('td[colspan="6"]')) return;
            const rowData = [];
            tr.querySelectorAll('td').forEach(td => rowData.push(td.innerText));
            if (rowData.length > 0) body.push(rowData);
        });
        if (body.length === 0) {
             M.toast({ html: 'Não há dados para exportar.', classes: 'orange' });
             return;
        }
        doc.autoTable({
            head: [['Nome', 'Email', 'Último Acesso', 'Qtd. Acessos', 'Validade', 'Status']],
            body: body, startY: 20, headStyles: { fillColor: [5, 137, 202] },
            didDrawPage: (data) => doc.text("Relatório de Uso - NetRádio", data.settings.margin.left, 15),
        });
        doc.save('relatorio_netradio.pdf');
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO (UI) ---

    function renderUserList(users) {
        userListTableBody.innerHTML = '';
        if (users.length === 0) {
            userListTableBody.appendChild(createRow('info', 'Nenhum usuário encontrado.'));
        } else {
            users.forEach(user => {
                const statusConfig = { 'Online': { class: 'green lighten-4 green-text text-darken-3', icon: 'check_circle' }, 'Bloqueado': { class: 'red lighten-4 red-text text-darken-3', icon: 'block' }, 'Offline': { class: 'grey lighten-2 grey-text text-darken-2', icon: 'power_settings_new' } };
                const currentStatus = statusConfig[user.status] || statusConfig['Offline'];
                const lastAccess = user.last_access ? new Date(user.last_access).toLocaleString('pt-BR') : 'Nunca';
                const validity = user.validity_date ? new Date(user.validity_date).toLocaleDateString('pt-BR') : 'N/A';
                const lockIcon = user.status === 'Bloqueado' ? 'lock_open' : 'lock';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><div style="font-weight: 600;">${user.name}</div><div class="grey-text text-darken-1">${user.email}</div></td>
                    <td><span class="status-chip ${currentStatus.class}"><i class="material-icons tiny left">${currentStatus.icon}</i>${user.status}</span></td>
                    <td>${lastAccess}</td><td>${user.access_count || 0}</td><td>${validity}</td>
                    <td class="center-align">
                        <a href="#!" class="btn-floating btn-small waves-effect waves-light orange tooltipped block-user" data-position="top" data-tooltip="${user.status === 'Bloqueado' ? 'Desbloquear' : 'Bloquear'}" data-user-id="${user.id}"><i class="material-icons">${lockIcon}</i></a>
                        <a href="#!" class="btn-floating btn-small waves-effect waves-light blue tooltipped edit-user" data-position="top" data-tooltip="Editar" data-user-id="${user.id}"><i class="material-icons">edit</i></a>
                        <a href="#!" class="btn-floating btn-small waves-effect waves-light red tooltipped delete-user" data-position="top" data-tooltip="Excluir" data-user-id="${user.id}"><i class="material-icons">delete</i></a>
                    </td>`;
                userListTableBody.appendChild(row);
            });
            M.Tooltip.init(document.querySelectorAll('.tooltipped'));
        }
        document.getElementById('displayedUsersCount').textContent = users.length;
        document.getElementById('totalUsersCount').textContent = allUsers.length;
    }
    
    function updateDashboardStats(users) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        document.getElementById('dashboardTotalUsers').textContent = users.length;
        document.getElementById('dashboardActiveUsers').textContent = users.filter(u => u.status === 'Online').length;
        document.getElementById('dashboardBlockedUsers').textContent = users.filter(u => u.status === 'Bloqueado').length;
        document.getElementById('dashboardExpiringAccess').textContent = users.filter(u => {
            if (!u.validity_date || u.status === 'Bloqueado') return false;
            const diffDays = (new Date(u.validity_date).setHours(0, 0, 0, 0) - today) / (1000 * 60 * 60 * 24);
            return diffDays >= 0 && diffDays <= 7;
        }).length;
    }

    function populateReportUserSelect(users) {
        const select = document.getElementById('reportUser');
        select.innerHTML = '<option value="all" selected>Todos</option>';
        users.forEach(user => { select.innerHTML += `<option value="${user.id}">${user.name}</option>`; });
        M.FormSelect.init(select);
    }

    function renderReportTable(data) {
        reportTableBody.innerHTML = '';
        if (data.length === 0) {
            reportTableBody.appendChild(createRow('info', 'Nenhum dado para os filtros aplicados.'));
        } else {
             data.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${user.name}</td><td>${user.email}</td><td>${user.last_access ? new Date(user.last_access).toLocaleString('pt-BR') : 'Nunca'}</td><td>${user.access_count || 0}</td><td>${user.validity_date ? new Date(user.validity_date).toLocaleDateString('pt-BR') : 'N/A'}</td><td>${user.status}</td>`;
                reportTableBody.appendChild(row);
            });
        }
    }
    
    function showConfirmationModal(title, message) {
         document.getElementById('confirmationModalTitle').textContent = title;
         document.getElementById('confirmationModalMessage').textContent = message;
         confirmationModalInstance.open();
         return new Promise(resolve => { resolveConfirmationPromise = resolve; });
    }
    
    function createRow(type, message) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.setAttribute('colspan', '6');
        cell.className = 'center-align grey-text';
        if (type === 'loading') {
            cell.innerHTML = `<div class="preloader-wrapper small active"><div class="spinner-layer spinner-blue-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div> Carregando...`;
        } else {
            cell.textContent = message;
        }
        row.appendChild(cell);
        return row;
    }

    // --- EVENT LISTENERS ---
    document.getElementById('logoutButton').addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = '/login/'; });
    document.querySelectorAll('.shortcut-card').forEach(card => card.addEventListener('click', () => M.Tabs.getInstance(document.querySelector('.tabs')).select(card.dataset.targetTab)));
    
    document.getElementById('addNewUserButton').addEventListener('click', () => {
        userForm.reset();
        document.getElementById('editingUserId').value = '';
        document.getElementById('modalTitle').textContent = 'Novo Usuário';
        document.getElementById('userPassword').setAttribute('required', 'required');
        M.Datepicker.getInstance(document.getElementById('userValidityDate')).setDate(null);
        userModalInstance.open();
    });

    userListTableBody.addEventListener('click', (e) => {
        const target = e.target.closest('a.btn-floating');
        if (!target) return;
        const userId = target.dataset.userId;
        const user = allUsers.find(u => u.id === userId);
        if (!user) return;

        if (target.classList.contains('edit-user')) {
            document.getElementById('editingUserId').value = user.id;
            document.getElementById('modalTitle').textContent = 'Editar Usuário';
            userForm.elements.userName.value = user.name || '';
            userForm.elements.userEmail.value = user.email || '';
            userForm.elements.userRadioLink.value = user.radio_link || '';
            userForm.elements.userWelcomeMessage.value = user.welcome_message || '';
            const validityDatepicker = M.Datepicker.getInstance(document.getElementById('userValidityDate'));
            if (user.validity_date) validityDatepicker.setDate(new Date(user.validity_date)); else validityDatepicker.setDate(null);
            document.getElementById('userPassword').removeAttribute('required');
            M.updateTextFields();
            userModalInstance.open();
        } else if (target.classList.contains('delete-user')) {
            handleDeleteUser(userId);
        } else if (target.classList.contains('block-user')) {
            handleBlockUser(userId);
        }
    });

    document.getElementById('saveUserButton').addEventListener('click', handleSaveUser);
    document.getElementById('messageForm').addEventListener('submit', saveDailyMessage);
    document.getElementById('userSearch').addEventListener('input', (e) => renderUserList(allUsers.filter(u => u.name?.toLowerCase().includes(e.target.value.toLowerCase()) || u.email?.toLowerCase().includes(e.target.value.toLowerCase()))));
    document.getElementById('applyFiltersButton').addEventListener('click', () => fetchReports({ userId: document.getElementById('reportUser').value, startDate: M.Datepicker.getInstance(document.getElementById('startDate')).date, endDate: M.Datepicker.getInstance(document.getElementById('endDate')).date }));
    document.getElementById('clearFiltersButton').addEventListener('click', () => { document.getElementById('reportUser').value = 'all'; M.FormSelect.init(document.getElementById('reportUser')); M.Datepicker.getInstance(document.getElementById('startDate')).setDate(null); M.Datepicker.getInstance(document.getElementById('endDate')).setDate(null); fetchReports(); });
    document.getElementById('downloadPdfButton').addEventListener('click', downloadPdf);
    document.getElementById('confirmAction').addEventListener('click', () => { confirmationModalInstance.close(); if(resolveConfirmationPromise) resolveConfirmationPromise(true); });
    document.getElementById('cancelConfirmation').addEventListener('click', () => { if(resolveConfirmationPromise) resolveConfirmationPromise(false); });

    // --- VERIFICAÇÃO DE ACESSO E CHAMADA INICIAL ---
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login/'; return; }
    
    const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (error || !profile || profile.role !== 'admin') {
        M.toast({ html: 'Acesso negado.', classes: 'red' });
        setTimeout(() => { supabase.auth.signOut(); window.location.href = '/login/'; }, 2000);
        return;
    }
    
    await fetchUsers();
    await fetchAndApplyDailyMessage();
    initializeMaterializeComponents();
});
