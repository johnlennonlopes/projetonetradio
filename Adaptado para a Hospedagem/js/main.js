/*
    Arquivo de Funcionalidades (JavaScript) - Landing Page
    Projeto: NetRádio
*/

// Este evento garante que o código só vai rodar depois que toda a página HTML for carregada.
document.addEventListener('DOMContentLoaded', () => {

    // --- INICIALIZAÇÃO DE COMPONENTES MATERIALIZE ---
    // Encontra todos os elementos 'collapsible' (o nosso FAQ) e os inicializa.
    const collapsibleElems = document.querySelectorAll('.collapsible');
    M.Collapsible.init(collapsibleElems, {
        accordion: false // Permite que vários itens fiquem abertos ao mesmo tempo.
    });


    // --- FUNCIONALIDADE: ANIMAÇÃO AO ROLAR A PÁGINA ---

    // Encontra todos os elementos com a classe '.reveal'.
    const revealElements = document.querySelectorAll('.reveal');

    // Cria a função que verifica a posição dos elementos na tela.
    const revealOnScroll = () => {
        const windowHeight = window.innerHeight; // Altura da janela do navegador

        revealElements.forEach(el => {
            const elementTop = el.getBoundingClientRect().top; // Distância do elemento até o topo da janela
            const revealPoint = 100; // Ponto em que a animação começa

            // Se o elemento estiver perto de aparecer na tela, adiciona a classe 'visible'.
            if (elementTop < windowHeight - revealPoint) {
                el.classList.add('visible');
            }
        });
    };
    
    // Adiciona o evento de rolagem para chamar a função.
    window.addEventListener('scroll', revealOnScroll);
    // Chama a função uma vez no início para revelar elementos que já estão na tela.
    revealOnScroll();

});
