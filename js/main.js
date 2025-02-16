// Language switching functionality - move these outside DOMContentLoaded
let currentLang = localStorage.getItem('language') || 'en';

function updateContent() {
    const elements = document.querySelectorAll('[data-i18n], [data-i18n-nested]');
    elements.forEach(element => {
        if (element.hasAttribute('data-i18n-nested')) {
            const key = element.getAttribute('data-i18n-nested');
            const keys = key.split('.');
            let value = translations[currentLang];
            for (const k of keys) {
                if (!value) return;
                value = value[k];
            }
            if (value && value[currentLang]) {
                element.textContent = value[currentLang];
            }
        } else {
            // Handle regular text content
            const key = element.getAttribute('data-i18n');
            const keys = key.split('.');
            let value = translations[currentLang];
            for (const k of keys) {
                if (!value) return;
                value = value[k];
            }
            if (!value) return;
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = value;
            } else {
                element.textContent = value;
            }
        }
    });

    // Update language toggle button text
    const langIndicator = document.querySelector('.lang-indicator');
    langIndicator.textContent = currentLang.toUpperCase();
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'no' : 'en';
    localStorage.setItem('language', currentLang);
    updateContent();
    document.documentElement.setAttribute('lang', currentLang);
    
    // Add visual feedback
    document.querySelector('.lang-toggle').animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.1)' },
        { transform: 'scale(1)' }
    ], 300);
}

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Simple fade-in animation for projects
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.projects-grid > *').forEach((el) => {
        observer.observe(el);
    });

    // Theme toggle functionality
    const themeToggle = document.querySelector('.theme-toggle');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcons(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcons(newTheme);
    });

    function updateThemeIcons(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        // No need to manually update icon display anymore as it's handled by CSS
    }

    // Initialize language
    updateContent();
    document.documentElement.setAttribute('lang', currentLang);

    // Add this to your existing JavaScript file
    function createProjectPopup() {
        const popup = document.getElementById('projectPopup');
        const closeBtn = popup.querySelector('.close-popup');
        const tabButtons = popup.querySelectorAll('.tab-button');
        
        function openPopup(projectData) {
            popup.querySelector('.popup-image').src = projectData.image;
            popup.querySelector('.popup-image').alt = projectData.title;
            popup.querySelector('.popup-title').textContent = projectData.title;
            
            // Show/hide demo button based on demoUrl availability
            const demoButton = popup.querySelector('.demo-button');
            if (projectData.demoUrl) {
                demoButton.style.display = 'flex';
                demoButton.href = projectData.demoUrl;
        } else {
                demoButton.style.display = 'none';
            }
            
            popup.querySelector('.source-button').href = projectData.sourceUrl;
            
            // Set content for each tab
            document.getElementById('overview').innerHTML = projectData.overview;
            document.getElementById('features').innerHTML = projectData.features;
            document.getElementById('technical').innerHTML = projectData.technical;
            
            popup.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        function closePopup() {
            popup.classList.remove('active');
            document.body.style.overflow = '';
        }
        
        // Tab switching
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons and panes
                tabButtons.forEach(btn => btn.classList.remove('active'));
                popup.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
                
                // Add active class to clicked button and corresponding pane
                button.classList.add('active');
                const tabId = button.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });
        
        // Close popup on button click or outside click
        closeBtn.addEventListener('click', closePopup);
        popup.addEventListener('click', (e) => {
            if (e.target === popup) closePopup();
        });
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && popup.classList.contains('active')) {
                closePopup();
            }
        });
        
        return { openPopup, closePopup };
    }

    // Initialize popup system
    const projectPopup = createProjectPopup();

   
    

    // Update the click handlers for project cards
    document.querySelectorAll('.project-card').forEach(card => {
        const handleCardClick = (e) => {
            const projectId = card.getAttribute('data-project-id');
            const currentLang = localStorage.getItem('language') || 'en';
            const projectData = translations[currentLang].projects[projectId];
            
            if (!projectData) {
                console.error('Project data not found for:', projectId);
                return;
            }
            
            const popupData = {
                title: projectData.title[currentLang],
                image: card.querySelector('img').src,
                demoUrl: projectData.demoUrl,
                sourceUrl: projectData.sourceUrl,
                overview: `<p>${projectData.overview[currentLang]}</p>`,
                features: `<ul>
                    ${projectData.features[currentLang].map(feature => `<li>${feature}</li>`).join('')}
                </ul>`,
                technical: `<div class="tech-stack">
                    <h4>${translations[currentLang].projects.technicalSection.technologiesUsed}</h4>
                    <ul>
                        ${Array.from(card.querySelectorAll('.tag'))
                            .map(tag => `<li>${tag.textContent}</li>`)
                            .join('')}
                    </ul>
                    <h4>${translations[currentLang].projects.technicalSection.implementationDetails}</h4>
                    <p>${projectData.technical.description[currentLang]}</p>
                </div>`
            };
            
            projectPopup.openPopup(popupData);
        };

        // Make entire card clickable
        card.addEventListener('click', handleCardClick);
        
        // Add keyboard accessibility
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick(e);
            }
        });
    });

    initLanguageGrid();
    initHeroAnimations();
    initCompetencyCards();
});

function initLanguageGrid() {
    const grid = document.querySelector('.language-grid');
    const characters = {
        programming: [
            '{', '}', '<>', '[]', '()', '=>', '&&', '||', '++', '--',
            '!=', '==', '+=', '*=', '/=', '?.', '??', '...', '://', '#!'
        ],
        japanese: [
            'あ', 'き', 'つ', 'ン', 'ル', 'カ', '語', '字', '日', '本',
            'み', 'お', 'こ', 'ど', 'も', 'ワ', 'ロ', '人', '月', '火'
        ],
        korean: [
            '한', '글', '자', '어', '말', '국', '사', '람', '물', '불',
            '해', '달', '별', '꿈', '밤', '낮', '빛', '강', '산', '바'
        ],
        norwegian: [
            'æ', 'ø', 'å', 'Æ', 'Ø', 'Å', 'én', 'to', 'på', 'av',
            'og', 'er', 'jeg', 'du', 'vi', 'de', 'den', 'det', 'kan', 'må'
        ],
        linguistics: [
            'φ', 'λ', 'β', 'α', 'Ω', '∑', '∞', '≈', '∈', '∀',
            '∃', '⊂', '⊃', '∪', '∩', '⊕', '⊗', '∇', '∫', '∂'
        ],
        nlp: [
            'NLP', 'AI', 'ML', 'py', 'js', '01', 'GPU', 'CPU', 'API', 'SQL',
            'CNN', 'RNN', 'GRU', 'SVM', 'KNN', 'OCR', 'ASR', 'TTS', 'NLU', 'NLG'
        ]
    };

    // Create grid cells with category-based positioning
    const gridSize = { rows: 20, cols: 20 };
    const cells = gridSize.rows * gridSize.cols;
    
    for (let i = 0; i < cells; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-character';
        
        // Add randomness to create empty spaces
        if (Math.random() > 0.4) { // 60% chance of being empty
            cell.textContent = '';
            grid.appendChild(cell);
            continue;
        }
        
        // Select category based on position in grid
        const row = Math.floor(i / gridSize.cols);
        const category = (() => {
            if (row < 4) return 'programming';
            if (row < 8) return 'japanese';
            if (row < 12) return 'korean';
            if (row < 14) return 'norwegian';
            if (row < 17) return 'linguistics';
            return 'nlp';
        })();
        
        // Select random character from category
        const categoryChars = characters[category];
        cell.textContent = categoryChars[Math.floor(Math.random() * categoryChars.length)];
        
        // Randomize animation
        cell.style.animationDelay = `${Math.random() * 8}s`;
        cell.style.animationDuration = `${4 + Math.random() * 4}s`;
        
        grid.appendChild(cell);
    }

    // Enhanced hover effect
    grid.addEventListener('mousemove', (e) => {
        const rect = grid.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        document.querySelectorAll('.grid-character').forEach(char => {
            const charRect = char.getBoundingClientRect();
            const charX = charRect.left - rect.left + charRect.width / 2;
            const charY = charRect.top - rect.top + charRect.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(x - charX, 2) + 
                Math.pow(y - charY, 2)
            );
            
            if (distance < 150) {
                const intensity = 1 - (distance / 150);
                char.style.opacity = Math.min(0.9, intensity);
                char.style.transform = `scale(${1 + intensity * 0.3})`;
                char.style.color = `hsl(${intensity * 60 + 30}, 70%, 60%)`;
            } else {
                char.style.opacity = '';
                char.style.transform = '';
                char.style.color = '';
            }
        });
    });

    // Reset on mouse leave
    grid.addEventListener('mouseleave', () => {
        document.querySelectorAll('.grid-character').forEach(char => {
            char.style.opacity = '';
            char.style.transform = '';
            char.style.color = '';
        });
    });
}

function initHeroAnimations() {
    // Remove floating code elements code
    
    // Update typing animation
    const heroTitle = document.querySelector('.hero-title');
    const highlight = heroTitle.querySelector('.highlight');
    const text = highlight.textContent;
    highlight.textContent = '';
    
    let charIndex = 0;
    function typeText() {
        if (charIndex < text.length) {
            highlight.textContent += text.charAt(charIndex);
            charIndex++;
            setTimeout(typeText, 100);
        } else {
            heroTitle.classList.add('animate');
            // Remove typing cursor after animation
            highlight.classList.add('typing-done');
        }
    }

    // Start animations when section is visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(typeText, 500);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    observer.observe(heroTitle);
}

function initCompetencyCards() {
    const competencyItems = document.querySelectorAll('.competency-item');
    
    competencyItems.forEach(item => {
        item.addEventListener('click', () => {
            // Toggle expanded state
            item.classList.toggle('expanded');
            
            // Optional: close other cards when one is opened
            competencyItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('expanded')) {
                    otherItem.classList.remove('expanded');
                }
            });
        });
    });
} 