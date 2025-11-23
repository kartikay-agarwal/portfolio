// Generate subtle particles
const generateParticles = (count) => {
    const container = document.getElementById('particle-background');
    if (!container) return;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');

        const size = Math.random() * 10 + 6; // 6px - 16px
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        particle.style.left = `${Math.random() * 100}vw`;
        particle.style.top = `${Math.random() * 100}vh`;

        particle.style.animationDuration = `${Math.random() * 35 + 25}s`; // 25s-60s
        particle.style.animationDelay = `-${Math.random() * 20}s`;

        container.appendChild(particle);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    generateParticles(40);

    // Mobile menu
    const menuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            const icon = menuButton.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });

        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                const icon = menuButton.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }

    // Header scroll style
    const header = document.getElementById('header');
    const handleHeaderScroll = () => {
        if (!header) return;
        if (window.scrollY > 40) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }
    };
    window.addEventListener('scroll', handleHeaderScroll);
    handleHeaderScroll();

    // Scroll reveal
    const animatedElements = document.querySelectorAll('[data-animate]');
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.18
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                obs.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => observer.observe(el));

    // Active nav link on scroll
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    const highlightNav = () => {
        let currentId = '';
        const headerHeight = header ? header.offsetHeight : 0;

        sections.forEach(section => {
            const top = section.offsetTop - headerHeight - 80;
            const height = section.offsetHeight;
            if (window.scrollY >= top && window.scrollY < top + height) {
                currentId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href') || '';
            if (currentId && href.includes(currentId)) {
                link.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', highlightNav);
    window.addEventListener('load', highlightNav);
});
